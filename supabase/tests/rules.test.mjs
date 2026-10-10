import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'

const MIG = process.argv[2]
const db = new PGlite()

// --- stand-ins for what Supabase provides -------------------------------
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage; create schema extensions;
  create table auth.users (id uuid primary key, email text,
    raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  grant all on all tables in schema storage to authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`)

for (const f of fs.readdirSync(MIG).sort()) {
  try { await db.exec(fs.readFileSync(path.join(MIG, f), 'utf8')); console.log('applied', f) }
  catch (e) { console.error('FAILED', f, e.message); process.exit(1) }
}

// --- helpers ------------------------------------------------------------
let fails = 0
const ids = { admin: '00000000-0000-0000-0000-00000000000a', lect: '00000000-0000-0000-0000-00000000000b',
  lect2: '00000000-0000-0000-0000-00000000000e',
  stu: '00000000-0000-0000-0000-00000000000c', stu2: '00000000-0000-0000-0000-00000000000d' }

async function as(uid, sql, params = []) {
  await db.exec('begin')
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid])
    await db.exec('set local role authenticated')
    const r = await db.query(sql, params)
    await db.exec('commit')
    return r.rows
  } catch (e) { await db.exec('rollback'); throw e }
}
async function ok(name, fn) {
  try { const r = await fn(); console.log('  ok  ', name, r === undefined ? '' : JSON.stringify(r)) }
  catch (e) { fails++; console.log('  FAIL', name, '->', e.message) }
}
async function denied(name, fn, match) {
  try { await fn(); fails++; console.log('  FAIL', name, '-> was allowed') }
  catch (e) {
    if (match && !e.message.includes(match)) { fails++; console.log('  FAIL', name, '-> wrong error:', e.message) }
    else console.log('  ok  ', name, '(blocked:', e.message + ')')
  }
}
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); return a }

// --- users --------------------------------------------------------------
await db.query(`insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ($1, 'admin@x', '{"role":"admin"}', '{"full_name":"Admin"}'),
  ($2, 'lect@x', '{"role":"lecturer"}', '{"full_name":"Lecturer One"}'),
  ($5, 'lect2@x', '{"role":"lecturer"}', '{"full_name":"Lecturer Two"}'),
  ($3, 'stu@gmail.com', '{}', '{"name":"Stu Dent"}'),
  ($4, 'stu2@gmail.com', '{}', '{"name":"Other Student"}')`,
  [ids.admin, ids.lect, ids.stu, ids.stu2, ids.lect2])

console.log('\nprofiles')
await ok('profiles created with roles', async () => eq(
  (await db.query(`select role::text from public.profiles order by id`)).rows.map(r => r.role),
  ['admin', 'lecturer', 'student', 'student', 'lecturer'], 'roles'))
await denied('student cannot make themselves admin', () => as(ids.stu, `update public.profiles set role = 'admin' where id = $1`, [ids.stu]), 'Only admin')
await denied('bad student number format', () => as(ids.stu, `update public.profiles set student_number = 'ST123' where id = $1`, [ids.stu]))
await ok('student sets student number (lowercase gets fixed)', () => as(ids.stu, `update public.profiles set student_number = 'st12345678' where id = $1 returning student_number`, [ids.stu]))
await denied('student cannot change it again', () => as(ids.stu, `update public.profiles set student_number = 'ST87654321' where id = $1`, [ids.stu]), 'Ask admin')
await denied('student number must be unique', () => as(ids.stu2, `update public.profiles set student_number = 'ST12345678' where id = $1`, [ids.stu2]))
await ok('student cannot see other students', async () => eq((await as(ids.stu, `select id from public.profiles`)).length, 1, 'visible profiles'))
await ok('admin sees everyone', async () => eq((await as(ids.admin, `select id from public.profiles`)).length, 5, 'visible profiles'))

console.log('\nlecturer accounts')
await ok('admin flags lecturer to change password', () => as(ids.admin, `update public.profiles set must_change_password = true, title = 'Dr' where id = $1 returning title`, [ids.lect]))
await denied('student cannot set the flag on themselves', () => as(ids.stu2, `update public.profiles set must_change_password = true where id = $1`, [ids.stu2]), 'Only admin')
await ok('lecturer clears own flag after new password', async () => eq((await as(ids.lect, `update public.profiles set must_change_password = false where id = $1 returning must_change_password`, [ids.lect]))[0].must_change_password, false, 'flag'))

console.log('\nmodules')
await ok('student adds a module (normalised)', () => as(ids.stu, `select public.add_module(' webd1111 ', 'Web Development') as code`))
await ok('adding an existing code reuses it', () => as(ids.stu, `select public.add_module('PROG1111', 'Typo name') as code`))
await ok('existing name untouched', async () => eq((await db.query(`select name from public.modules where code='PROG1111'`)).rows[0].name, 'Programming 1', 'name'))
await denied('bad module code rejected', () => as(ids.stu, `select public.add_module('PROG11', 'x')`))
await denied('student cannot rename modules', async () => { const r = await as(ids.stu, `update public.modules set name='Hacked' where code='PROG1111' returning code`); if (!r.length) throw new Error('0 rows (RLS)') })
await ok('student picks modules', () => as(ids.stu, `insert into public.student_modules values ($1,'PROG1111'),($1,'NETW1111')`, [ids.stu]))
await denied('student cannot pick for someone else', () => as(ids.stu, `insert into public.student_modules values ($1,'PROG1111')`, [ids.stu2]))

console.log('\napplications')
await denied('student without number cannot apply', () => as(ids.stu2, `insert into public.applications (student_id, results_path) values ($1, 'x')`, [ids.stu2]), 'student number')
let appId
await ok('student applies (status forced to pending)', async () => {
  const r = await as(ids.stu, `insert into public.applications (student_id, results_path, status) values ($1, 'results/x.pdf', 'approved') returning id, status`, [ids.stu])
  appId = r[0].id; return eq(r[0].status, 'pending', 'status')
})
await ok('student adds marks', () => as(ids.stu, `insert into public.application_marks values ($1,'PROG1111',82,true),($1,'NETW1111',79,false)`, [appId]))
await denied('second open application blocked', () => as(ids.stu, `insert into public.applications (student_id, results_path) values ($1, 'y')`, [ids.stu]))
await ok('other student cannot see it', async () => eq((await as(ids.stu2, `select id from public.applications`)).length, 0, 'rows'))
await denied('student cannot decide', () => as(ids.stu, `select public.decide_application($1, true, 'yay')`, [appId]), 'Admin only')
await denied('admin must give a message', () => as(ids.admin, `select public.decide_application($1, true, '  ')`, [appId]), 'response')
await ok('admin approves', () => as(ids.admin, `select public.decide_application($1, true, 'Welcome aboard')`, [appId]))
await ok('student is now a tutor for PROG1111 only', async () => {
  eq((await db.query(`select is_tutor from public.profiles where id=$1`, [ids.stu])).rows[0].is_tutor, true, 'is_tutor')
  return eq((await db.query(`select module_code from public.tutor_modules where tutor_id=$1`, [ids.stu])).rows.map(r => r.module_code), ['PROG1111'], 'tutor modules')
})
await ok('welcome message landed', async () => eq((await as(ids.stu, `select topic, body from public.messages`)).map(m => m.body), ['Welcome aboard'], 'messages'))
await denied('cannot decide twice', () => as(ids.admin, `select public.decide_application($1, false, 'no')`, [appId]), 'already')

console.log('\nmessaging')
await db.query(`insert into public.lecturer_modules values ($1, 'PROG1111'), ($2, 'MATH1111')`, [ids.lect, ids.lect2])
await ok('lecturer can message tutor on shared module', () => as(ids.lect, `select public.send_message($1, 'Week 8', 'Focus on arrays')`, [ids.stu]))
await denied('lecturer cannot message tutor without shared module', () => as(ids.lect2, `select public.send_message($1, 'Hi', 'x')`, [ids.stu]), "can't message")
await denied('lecturer cannot message a plain student', () => as(ids.lect, `select public.send_message($1, 'Hi', 'x')`, [ids.stu2]), "can't message")
await denied('lecturers cannot message each other', () => as(ids.lect, `select public.send_message($1, 'Hi', 'x')`, [ids.lect2]), "can't message")
await ok('tutor replies to lecturer', () => as(ids.stu, `select public.send_message($1, 'Re: Week 8', 'Will do')`, [ids.lect]))
await ok('lecturer2 sees no threads and not the tutor', async () => {
  eq((await as(ids.lect2, `select id from public.conversations`)).length, 0, 'conversations')
  return eq((await as(ids.lect2, `select id from public.profiles where id = $1`, [ids.stu])).length, 0, 'tutor visible')
})
await ok('lecturer sees tutor profile', async () => eq((await as(ids.lect, `select full_name from public.profiles where id=$1`, [ids.stu])).length, 1, 'visible'))
await ok('tutor unread count is 1, then 0 after reading', async () => {
  const conv = (await as(ids.stu, `select id from public.conversations where $1 in (user_a, user_b)`, [ids.lect]))[0].id
  eq((await as(ids.stu, `select count(*)::int n from public.messages where conversation_id=$1 and sender_id<>$2 and read_at is null`, [conv, ids.stu]))[0].n, 1, 'unread')
  await as(ids.stu, `select public.mark_conversation_read($1)`, [conv])
  return eq((await as(ids.stu, `select count(*)::int n from public.messages where conversation_id=$1 and sender_id<>$2 and read_at is null`, [conv, ids.stu]))[0].n, 0, 'unread after')
})
await denied('cannot forge sender on direct insert', async () => {
  const conv = (await as(ids.stu, `select id from public.conversations where $1 in (user_a, user_b)`, [ids.lect]))[0].id
  await as(ids.stu, `insert into public.messages (conversation_id, sender_id, topic, body) values ($1, $2, 'x', 'y')`, [conv, ids.lect])
})
await ok('removing the shared module hides the thread', async () => {
  await db.query(`delete from public.lecturer_modules where lecturer_id=$1`, [ids.lect])
  eq((await as(ids.lect, `select id from public.messages`)).length, 0, 'messages visible')
  await db.query(`insert into public.lecturer_modules values ($1, 'PROG1111')`, [ids.lect])
})

console.log('\nsessions and quota')
await denied('session outside any semester', () => as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date) values ($1,'PROG1111','2026-03-02')`, [ids.stu]), 'No semester')
let sem
await ok('admin adds semester with quota 3', async () => { sem = (await as(ids.admin, `insert into public.semesters (name, starts_on, ends_on, session_quota) values ('S2 2026','2026-07-13','2026-11-27',3) returning id`))[0].id })
await denied('overlapping semester blocked', () => as(ids.admin, `insert into public.semesters (name, starts_on, ends_on) values ('Overlap','2026-11-01','2026-12-31')`))
await ok('dry run: 7 Mondays, 3 fit, 4 over quota, nothing saved', async () => {
  const r = (await as(ids.admin, `select * from public.admin_create_slot($1,'PROG1111',1::smallint,'14:00','15:30','Lab 2','2026-10-05','2026-11-16',true)`, [ids.stu]))[0]
  eq(r, { weeks: 7, created: 3, over_quota: 4, outside_semester: 0 }, 'counts')
  return eq((await db.query(`select count(*)::int n from public.sessions`)).rows[0].n, 0, 'sessions saved')
})
await denied('slot for a module they are not approved for', () => as(ids.admin, `select * from public.admin_create_slot($1,'NETW1111',1::smallint,'14:00','15:30','Lab 2','2026-10-05','2026-11-16')`, [ids.stu]), 'approved')
await ok('real slot creates 3 sessions', async () => eq((await as(ids.admin, `select created from public.admin_create_slot($1,'PROG1111',1::smallint,'14:00','15:30','Lab 2','2026-10-05','2026-11-16')`, [ids.stu]))[0].created, 3, 'created'))
await ok('tutor sees used 3 of 3', async () => eq((await as(ids.stu, `select public.sessions_used($1,$2) used, public.tutor_quota($1,$2) quota`, [ids.stu, sem]))[0], { used: 3, quota: 3 }, 'quota'))
await ok('other users get null quota info', async () => eq((await as(ids.stu2, `select public.sessions_used($1,$2) used`, [ids.stu, sem]))[0].used, 0, 'used'))
await denied('tutor cannot log a 4th session', () => as(ids.stu, `select public.tutor_log_session('2026-10-08','PROG1111',5)`), 'quota')
await denied('admin cannot add a 4th either', () => as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, status) values ($1,'PROG1111','2026-10-09','confirmed')`, [ids.stu]), 'quota')
await ok('cancel one frees a slot', async () => {
  await as(ids.admin, `update public.sessions set status='cancelled' where tutor_id=$1 and session_date='2026-10-19'`, [ids.stu])
  return as(ids.stu, `select public.tutor_log_session('2026-10-08','PROG1111',5) id`)
})
await denied('un-cancelling goes over quota again', () => as(ids.admin, `update public.sessions set status='scheduled' where tutor_id=$1 and session_date='2026-10-19'`, [ids.stu]), 'quota')
await ok('per-tutor override to 5 lets admin un-cancel', async () => {
  await as(ids.admin, `insert into public.tutor_quota_overrides values ($1,$2,5)`, [ids.stu, sem])
  await as(ids.admin, `update public.sessions set status='scheduled' where tutor_id=$1 and session_date='2026-10-19'`, [ids.stu])
  return (await as(ids.stu, `select public.sessions_used($1,$2) used, public.tutor_quota($1,$2) quota`, [ids.stu, sem]))[0]
})
await ok('tutor marks the 5 Oct session', () => as(ids.stu, `select public.tutor_mark_session((select id from public.sessions where session_date='2026-10-05'), 9)`))
await denied('tutor cannot mark a future session', () => as(ids.stu, `select public.tutor_mark_session((select id from public.sessions where session_date='2026-10-19'), 9)`), 'before it happens')
await denied('tutor cannot confirm directly', async () => { const r = await as(ids.stu, `update public.sessions set status='confirmed' where session_date='2026-10-05' returning id`); if (!r.length) throw new Error('0 rows (RLS)') })
await denied('cannot pay before confirming', () => as(ids.admin, `update public.sessions set status='paid' where session_date='2026-10-05'`), 'Confirm')
await ok('admin confirms: rate frozen at 150', async () => eq((await as(ids.admin, `update public.sessions set status='confirmed' where session_date='2026-10-05' returning rate::int`))[0].rate, 150, 'rate'))
await ok('rate change does not touch confirmed session', async () => {
  await as(ids.admin, `update public.settings set rate_per_session = 200`)
  return eq((await db.query(`select rate::int from public.sessions where session_date='2026-10-05'`)).rows[0].rate, 150, 'rate')
})
await ok('admin marks paid', () => as(ids.admin, `update public.sessions set status='paid' where session_date='2026-10-05' returning paid_at is not null as stamped`))
await denied('paid session is locked', () => as(ids.admin, `update public.sessions set status='cancelled' where session_date='2026-10-05'`), 'paid')
await ok('lecturer sees PROG1111 sessions', async () => (await as(ids.lect, `select count(*)::int n from public.sessions`))[0])
await ok('lecturer2 sees none', async () => eq((await as(ids.lect2, `select count(*)::int n from public.sessions`))[0].n, 0, 'sessions'))

console.log('\nmodule merge')
await ok('admin merges WEBD1111 into PROG1111', async () => {
  await as(ids.stu2, `insert into public.student_modules values ($1,'WEBD1111')`, [ids.stu2])
  await as(ids.admin, `select public.merge_modules('WEBD1111','PROG1111')`)
  return eq((await db.query(`select module_code from public.student_modules where student_id=$1`, [ids.stu2])).rows.map(r => r.module_code), ['PROG1111'], 'moved')
})
await denied('student cannot merge', () => as(ids.stu, `select public.merge_modules('NETW1111','PROG1111')`), 'Admin only')

console.log('\napply in one step')
await db.query(`update public.profiles set student_number = 'ST20000002' where id = $1`, [ids.stu2])
const path2 = ids.stu2 + '/results.pdf'
await denied('results must be in your own folder', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":90,"applying":true}]')`, [ids.stu + '/x.pdf']), 'Upload your statement')
await denied('needs marks', () => as(ids.stu2, `select public.submit_application($1, '[]')`, [path2]), 'Add the marks')
await denied('needs a module to tutor', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":90}]')`, [path2]), 'at least one module')
await denied('below the minimum mark cannot be tutored', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":74,"applying":true}]')`, [path2]), 'You need at least 75% in PROG1111')
await ok('nothing half-saved after a refusal', async () => eq((await db.query(`select count(*)::int n from public.applications where student_id=$1`, [ids.stu2])).rows[0].n, 0, 'apps'))
await denied('direct mark insert also checks the minimum', async () => {
  const [{ id }] = await as(ids.stu2, `insert into public.applications (student_id, results_path) values ($1, $2) returning id`, [ids.stu2, path2])
  try { await as(ids.stu2, `insert into public.application_marks values ($1,'PROG1111',60,true)`, [id]) }
  finally { await db.query(`delete from public.applications where id=$1`, [id]) }
}, 'You need at least')
await ok('student submits marks in one step', async () => {
  const [{ id }] = await as(ids.stu2, `select public.submit_application($1, '[{"module_code":" prog1111 ","mark":91,"applying":true},{"module_code":"NETW1111","mark":60}]') id`, [path2])
  return eq((await db.query(`select module_code, mark, applying from public.application_marks where application_id=$1 order by module_code`, [id])).rows,
    [{ module_code: 'NETW1111', mark: 60, applying: false }, { module_code: 'PROG1111', mark: 91, applying: true }], 'marks')
})
await denied('only one open application', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":91,"applying":true}]')`, [path2]), 'applications_one_open')
await denied('signed-out users cannot submit', async () => {
  await db.exec('begin'); await db.exec('set local role anon')
  try { await db.query(`select public.submit_application('x', '[]')`) } finally { await db.exec('rollback') }
}, 'permission denied')

console.log('\nstorage')
await ok('student uploads to own results folder', () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('results', $1)`, [ids.stu2 + '/statement.pdf']))
await denied("student cannot upload into someone else's folder", () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('results', $1)`, [ids.stu + '/evil.pdf']))
await ok('other student cannot read it', async () => eq((await as(ids.stu, `select name from storage.objects where bucket_id='results'`)).length, 0, 'visible'))
await ok('admin can read it', async () => eq((await as(ids.admin, `select name from storage.objects where bucket_id='results'`)).length, 1, 'visible'))
await denied('non-tutor cannot upload a register', () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('registers', $1)`, [ids.stu2 + '/r.pdf']))
await ok('tutor uploads a register', () => as(ids.stu, `insert into storage.objects (bucket_id, name) values ('registers', $1)`, [ids.stu + '/r.jpg']))

console.log('\nsigned-out users')
await ok('anon sees nothing', async () => {
  await db.exec('begin'); await db.exec('set local role anon')
  try { return eq((await db.query('select * from public.profiles')).rows.length, 0, 'rows') } finally { await db.exec('rollback') }
})

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
