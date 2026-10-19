import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'

const MIG = process.argv[2]

// The tests are written around mid-October 2026 (a session on 19 Oct is "in the future").
// Run the database's clock as if it were 14 Oct 2026, 10:00 SAST, whatever today is.
const realNow = Date.now.bind(Date)
const shift = Date.parse('2026-10-14T08:00:00Z') - realNow()
Date.now = () => realNow() + shift
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
  -- Vault and pg_net: notifications are recorded here instead of being sent.
  create schema vault; create table vault.decrypted_secrets (name text, decrypted_secret text);
  insert into vault.decrypted_secrets values ('push_url', 'https://example.test/send-push'), ('push_secret', 's3cret');
  create schema net; create table net.sent (id serial, url text, body jsonb, headers jsonb);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language sql as $$ insert into net.sent (url, body, headers) values (url, body, headers) returning id::bigint $$;
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
  ($3, 'stu@x', '{"role":"student"}', '{"name":"Stu Dent"}'),
  ($4, 'stu2@x', '{"role":"student"}', '{"name":"Other Student"}')`,
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
await denied('students can no longer add modules', () => as(ids.stu, `select public.add_module('WEBD1111', 'Web Development')`), 'Only admin')
await ok('admin adds a module (normalised)', () => as(ids.admin, `select public.add_module(' webd1111 ', 'Web Development') as code`))
await ok('adding an existing code reuses it', () => as(ids.admin, `select public.add_module('PROG1111', 'Typo name') as code`))
await ok('existing name untouched', async () => eq((await db.query(`select name from public.modules where code='PROG1111'`)).rows[0].name, 'Programming 1', 'name'))
await denied('bad module code rejected', () => as(ids.admin, `select public.add_module('PROG11', 'x')`))
await ok("Rosebank's codes that aren't 4+4 are allowed", async () => eq((await db.query(`select count(*)::int n from public.modules where code in ('ACAD121', 'XBLAW5119', 'XADAD7112', 'INPCF110')`)).rows[0].n, 4, 'codes'))
await ok('the catalogue is loaded: 32 qualifications, 800 links, 154 electives', async () => {
  eq((await db.query(`select count(*)::int q from public.qualifications where faculty is not null`)).rows[0].q, 32, 'qualifications')
  return eq((await db.query(`select count(*)::int n, count(*) filter (where elective)::int e from public.qualification_modules`)).rows[0], { n: 800, e: 154 }, 'links')
})
await ok('DISD0601 by year matches the code rule', async () => {
  const rows = (await db.query(`select year, string_agg(module_code, ' ' order by module_code) m from public.qualification_modules where qualification_code = 'DISD0601' group by year order by year`)).rows
  return eq(rows.map(r => [r.year, r.m]), [
    [1, 'BUIS5111 IQTT5111 ITPP5112 OPSY5121 PRLD5121 PROG5121 PROG6112 WEDE5020'],
    [2, 'DATA6211 DATA6222 HCIN6222 IPMA6212 PROG6212 PROG6221 SAND6221 WEDE6021'],
    [3, 'ADDB6311 APPR6312 ISEC6321 OPSC6311 OPSC6312 SQAT6322 XISD5319 XISD6329']], 'years')
})
await denied('student cannot rename modules', async () => { const r = await as(ids.stu, `update public.modules set name='Hacked' where code='PROG1111' returning code`); if (!r.length) throw new Error('0 rows (RLS)') })
await ok('student picks modules', () => as(ids.stu, `insert into public.student_modules values ($1,'PROG1111'),($1,'NETW1111')`, [ids.stu]))
await denied('student cannot pick for someone else', () => as(ids.stu, `insert into public.student_modules values ($1,'PROG1111')`, [ids.stu2]))

console.log('\napplications')
await denied('student cannot mark a module high-risk', async () => { const r = await as(ids.stu, `update public.modules set high_risk = true where code='PROG1111' returning code`); if (!r.length) throw new Error('0 rows (RLS)') })
await ok('admin marks PROG1111 high-risk (open for tutoring)', () => as(ids.admin, `update public.modules set high_risk = true where code='PROG1111' returning code`))
await denied('student without number cannot apply', () => as(ids.stu2, `insert into public.applications (student_id, results_path) values ($1, 'x')`, [ids.stu2]), 'student number')
let appId
await ok('student applies (status forced to pending)', async () => {
  const r = await as(ids.stu, `insert into public.applications (student_id, results_path, status) values ($1, 'results/x.pdf', 'approved') returning id, status`, [ids.stu])
  appId = r[0].id; return eq(r[0].status, 'pending', 'status')
})
await ok('student adds a mark', () => as(ids.stu, `insert into public.application_marks values ($1,'PROG1111',82,true)`, [appId]))
await denied('not for a module that isn\'t high-risk', () => as(ids.stu, `insert into public.application_marks values ($1,'NETW1111',79,true)`, [appId]), "isn't open for tutor applications")
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
await ok('inbox: one row per thread, latest message, unread count', async () => {
  await as(ids.lect, `select public.send_message($1, 'Week 9', 'Recursion next')`, [ids.stu])
  const [r] = await as(ids.stu, `select other_id, other_name, other_role::text, last_topic, last_from_me, unread from public.my_inbox()`)
  return eq(r, { other_id: ids.lect, other_name: 'Lecturer One', other_role: 'lecturer', last_topic: 'Week 9', last_from_me: false, unread: 1 }, 'row')
})
await ok("the lecturer's inbox shows it as sent; the tutor's earlier reply is still unread", async () => {
  const [r] = await as(ids.lect, `select last_from_me, unread from public.my_inbox()`)
  return eq(r, { last_from_me: true, unread: 1 }, 'row')
})
await ok('inbox hides threads you lost access to', async () => {
  await db.query(`delete from public.lecturer_modules where lecturer_id=$1`, [ids.lect])
  eq((await as(ids.lect, `select * from public.my_inbox()`)).length, 0, 'rows')
  await db.query(`insert into public.lecturer_modules values ($1, 'PROG1111')`, [ids.lect])
})
await ok('other people see none of it', async () => eq((await as(ids.lect2, `select * from public.my_inbox()`)).length, 0, 'rows'))

console.log('\nsessions and quota')
// These tests predate check-in; the attendance section turns the minimum back on.
await db.query(`update public.settings set min_attendance = 0`)
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

console.log('\nending a weekly slot')
const slotId = (await db.query(`select id from public.schedule_slots limit 1`)).rows[0].id
await denied('tutor cannot end a slot', () => as(ids.stu, `select public.admin_end_slot($1,'2026-10-13')`, [slotId]), 'Admin only')
await ok('admin ends it from 13 Oct: only the 19 Oct session is cancelled', async () => {
  eq((await as(ids.admin, `select public.admin_end_slot($1,'2026-10-13') n`, [slotId]))[0].n, 1, 'cancelled')
  eq((await db.query(`select session_date::text d, status::text s from public.sessions where slot_id=$1 order by session_date`, [slotId])).rows,
    [{ d: '2026-10-05', s: 'paid' }, { d: '2026-10-12', s: 'scheduled' }, { d: '2026-10-19', s: 'cancelled' }], 'sessions')
  return eq((await db.query(`select until::text from public.schedule_slots where id=$1`, [slotId])).rows[0].until, '2026-10-12', 'until')
})

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
await denied('needs a module', () => as(ids.stu2, `select public.submit_application($1, '[]')`, [path2]), 'Choose at least one module')
await denied('needs a mark for each module', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111"}]')`, [path2]), 'Enter your mark for PROG1111')
await denied('marks over 100 rejected', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":120}]')`, [path2]), 'Enter your mark for PROG1111')
await denied('only high-risk modules', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":90},{"module_code":"NETW1111","mark":90}]')`, [path2]), "NETW1111 isn't open")
await denied('not a module you already tutor', () => as(ids.stu, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":90}]')`, [ids.stu + '/r.pdf']), 'You already tutor PROG1111')
await ok('nothing half-saved after a refusal', async () => eq((await db.query(`select count(*)::int n from public.applications where student_id=$1`, [ids.stu2])).rows[0].n, 0, 'apps'))
await ok('student submits marks in one step', async () => {
  const [{ id }] = await as(ids.stu2, `select public.submit_application($1, '[{"module_code":" prog1111 ","mark":91}]') id`, [path2])
  return eq((await db.query(`select module_code, mark, applying from public.application_marks where application_id=$1 order by module_code`, [id])).rows,
    [{ module_code: 'PROG1111', mark: 91, applying: true }], 'marks')
})
await denied('only one open application', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":91,"applying":true}]')`, [path2]), 'applications_one_open')
await denied('signed-out users cannot submit', async () => {
  await db.exec('begin'); await db.exec('set local role anon')
  try { await db.query(`select public.submit_application('x', '[]')`) } finally { await db.exec('rollback') }
}, 'permission denied')

console.log('\nregisters')
const s1012 = (await db.query(`select id from public.sessions where tutor_id=$1 and session_date='2026-10-12'`, [ids.stu])).rows[0].id
await ok('tutor files a register against their own session', () => as(ids.stu, `insert into public.registers (tutor_id, module_code, session_id, storage_path, file_name) values ($1,'PROG1111',$2,$3,'r.jpg') returning id`, [ids.stu, s1012, ids.stu + '/r.jpg']))
await denied('not for a module they do not tutor', () => as(ids.stu, `insert into public.registers (tutor_id, module_code, storage_path, file_name) values ($1,'NETW1111',$2,'r.jpg')`, [ids.stu, ids.stu + '/r.jpg']))
await denied('not against someone else\'s session', async () => {
  await db.query(`insert into public.tutor_modules values ($1,'PROG1111') on conflict do nothing`, [ids.stu2])
  await db.query(`update public.profiles set is_tutor = true where id=$1`, [ids.stu2])
  await as(ids.stu2, `insert into public.registers (tutor_id, module_code, session_id, storage_path, file_name) values ($1,'PROG1111',$2,$3,'r.jpg')`, [ids.stu2, s1012, ids.stu2 + '/r.jpg'])
})
await ok('other tutors cannot see it', async () => eq((await as(ids.stu2, `select id from public.registers`)).length, 0, 'visible'))
await db.query(`update public.profiles set is_tutor = false where id=$1`, [ids.stu2])
await db.query(`delete from public.tutor_modules where tutor_id=$1`, [ids.stu2])

console.log('\nreviewing applications')
const [{ id: app2 }] = (await db.query(`select id from public.applications where student_id=$1 and status='pending'`, [ids.stu2])).rows
await denied('student cannot move their own application along', () => as(ids.stu2, `update public.applications set status='under_review' where id=$1 returning id`, [app2]).then(r => { if (!r.length) throw new Error('no rows (blocked by RLS)') }))
await ok('admin moves it to under review', () => as(ids.admin, `update public.applications set status='under_review', background_checked=true where id=$1 returning status`, [app2]))
await denied('admin cannot approve with a plain edit', () => as(ids.admin, `update public.applications set status='approved' where id=$1`, [app2]), 'Use Approve or Decline')
await ok('templates have a kind', async () => eq((await as(ids.admin, `select kind from public.response_templates order by sort_order`)).map(r => r.kind), ['decline', 'decline', 'decline', 'approve'], 'kinds'))
await denied('students cannot read templates', async () => { const r = await as(ids.stu2, `select id from public.response_templates`); if (!r.length) throw new Error('none visible') }, 'none visible')
await ok('admin declines; student reads the reply', async () => {
  await as(ids.admin, `select public.decide_application($1, false, 'Not this time')`, [app2])
  eq((await as(ids.stu2, `select status::text, response_message from public.applications where id=$1`, [app2]))[0], { status: 'rejected', response_message: 'Not this time' }, 'reply')
  return eq((await db.query(`select is_tutor from public.profiles where id=$1`, [ids.stu2])).rows[0].is_tutor, false, 'is_tutor')
})
await denied('decided application cannot be reopened', () => as(ids.admin, `update public.applications set status='pending' where id=$1`, [app2]), 'already been decided')
await ok('student can apply again after a decline', () => as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":91,"applying":true}]') is not null ok`, [path2]))

console.log('\npush notifications')
const pushes = async () => (await db.query(`select body from net.sent order by id`)).rows.map(r => r.body)
const lastPush = async () => (await pushes()).at(-1)
await ok('a message buzzes the other person, with the secret', async () => {
  await db.query(`truncate net.sent`)
  await as(ids.lect, `select public.send_message($1, 'Venue change', 'Lab 4 today')`, [ids.stu])
  const r = (await db.query(`select body, headers from net.sent`)).rows[0]
  eq(r.headers['x-push-secret'], 's3cret', 'secret')
  return eq({ to: r.body.user_ids, title: r.body.title, body: r.body.body, url: r.body.url }, { to: [ids.stu], title: 'Dr Lecturer One', body: 'Venue change', url: '?view=tutor&tab=inbox' }, 'push')
})
await ok('a decision buzzes the student', async () => {
  await db.query(`truncate net.sent`)
  const [{ id }] = await as(ids.stu2, `select id from public.applications where status in ('pending','under_review')`)
  await as(ids.admin, `update public.applications set background_checked = true where id=$1`, [id])
  await as(ids.admin, `select public.decide_application($1, false, 'Not this time either')`, [id])
  const p = await lastPush()
  return eq([p.user_ids, p.title, p.url], [[ids.stu2], 'Your tutoring application', '?view=student&tab=apply'], 'push')
})
await ok('a new application buzzes every admin', async () => {
  await db.query(`truncate net.sent`)
  await as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":91,"applying":true}]')`, [path2])
  const p = (await pushes()).find(x => x.title === 'New tutor application')
  return eq([p?.user_ids, p?.body], [[ids.admin], 'Other Student wants to tutor.'], 'admins')
})
await ok('confirming several sessions at once sends one notification', async () => {
  await db.query(`truncate net.sent`)
  await db.query(`update public.tutor_quota_overrides set session_quota = 20`)
  for (const d of ['2026-10-14', '2026-10-15', '2026-10-16']) await as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, status) values ($1,'PROG1111',$2,'logged')`, [ids.stu, d])
  await as(ids.admin, `update public.sessions set status='confirmed' where tutor_id=$1 and status='logged'`, [ids.stu])
  const all = await pushes()
  eq(all.length, 1, 'notifications')
  return eq([all[0].user_ids, all[0].title, all[0].body], [[ids.stu], 'Sessions confirmed', "Admin confirmed 4 sessions. It's on your Pay tab."], 'push')
})
await ok('marking them paid says how much', async () => {
  await db.query(`truncate net.sent`)
  await as(ids.admin, `update public.sessions set status='paid' where tutor_id=$1 and status='confirmed'`, [ids.stu])
  return eq((await lastPush()).body, 'R800 for 4 sessions was marked as paid.', 'body')
})
await ok("morning reminder lists today's sessions", async () => {
  await db.query(`truncate net.sent`)
  const today = (await db.query(`select (now() at time zone 'Africa/Johannesburg')::date::text d`)).rows[0].d
  await db.query(`insert into public.semesters (name, starts_on, ends_on) select 'Now', $1::date - 1, $1::date + 1 where not exists (select 1 from public.semesters where $1::date between starts_on and ends_on)`, [today])
  await as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, starts_at, venue) values ($1,'PROG1111',$2,'14:00','Lab 2')`, [ids.stu, today])
  eq((await db.query(`select public.send_session_reminders() n`)).rows[0].n, 1, 'tutors reminded')
  return eq((await lastPush()).body, '14:00 · PROG1111 · Lab 2', 'body')
})
await denied('signed-in users cannot send notifications themselves', () => as(ids.stu, `select public.notify(array[$1]::uuid[], 'x', 'y', 'z')`, [ids.admin]), 'permission denied')
await ok('without the Vault secrets nothing is sent and nothing breaks', async () => {
  await db.query(`truncate net.sent`); await db.query(`update vault.decrypted_secrets set name = 'x_' || name`)
  await as(ids.lect, `select public.send_message($1, 'Quiet', 'No push')`, [ids.stu])
  await db.query(`update vault.decrypted_secrets set name = substr(name, 3)`)
  return eq((await pushes()).length, 0, 'sent')
})

console.log('\nstorage')
await ok('student uploads to own results folder', () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('results', $1)`, [ids.stu2 + '/statement.pdf']))
await denied("student cannot upload into someone else's folder", () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('results', $1)`, [ids.stu + '/evil.pdf']))
await ok('other student cannot read it', async () => eq((await as(ids.stu, `select name from storage.objects where bucket_id='results'`)).length, 0, 'visible'))
await ok('admin can read it', async () => eq((await as(ids.admin, `select name from storage.objects where bucket_id='results'`)).length, 1, 'visible'))
await denied('non-tutor cannot upload a register', () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('registers', $1)`, [ids.stu2 + '/r.pdf']))
await ok('tutor uploads a register', () => as(ids.stu, `insert into storage.objects (bucket_id, name) values ('registers', $1)`, [ids.stu + '/r.jpg']))

console.log('\nfiles on messages')
const f1 = ids.stu + '/notes.pdf'
const fileJson = p => JSON.stringify({ path: p, name: 'Week 8 notes.pdf', size: 12345, type: 'application/pdf' })
await denied('plain students cannot upload message files', () => as(ids.stu2, `insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [ids.stu2 + '/x.pdf']))
await denied("not into someone else's folder", () => as(ids.stu, `insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [ids.lect + '/x.pdf']))
await ok('tutor uploads a file and sends it with no text', async () => {
  await as(ids.stu, `insert into storage.objects (bucket_id, name) values ('attachments', $1)`, [f1])
  await db.query(`truncate net.sent`)
  await as(ids.stu, `select public.send_message($1, 'Notes', '', $2::jsonb)`, [ids.lect, fileJson(f1)])
  eq((await lastPush()).body, 'Notes · 📎 Week 8 notes.pdf', 'push body')
  return eq((await as(ids.lect, `select file_name, file_size from public.messages where file_path = $1`, [f1]))[0], { file_name: 'Week 8 notes.pdf', file_size: 12345 }, 'message')
})
await ok('the recipient can open the file', async () => eq((await as(ids.lect, `select name from storage.objects where bucket_id='attachments'`)).length, 1, 'visible'))
await ok('nobody else can', async () => {
  eq((await as(ids.lect2, `select name from storage.objects where bucket_id='attachments'`)).length, 0, 'lect2')
  return eq((await as(ids.stu2, `select name from storage.objects where bucket_id='attachments'`)).length, 0, 'stu2')
})
await denied("cannot attach someone else's file", () => as(ids.lect, `select public.send_message($1, 'Mine now', 'x', $2::jsonb)`, [ids.stu, fileJson(f1)]), 'Attach the file again')
await denied('cannot attach a file that was never uploaded', () => as(ids.stu, `select public.send_message($1, 'Ghost', 'x', $2::jsonb)`, [ids.lect, fileJson(ids.stu + '/ghost.pdf')]), 'Attach the file again')
await denied('a message needs text or a file', () => as(ids.stu, `select public.send_message($1, 'Empty', '  ')`, [ids.lect]), 'messages_body_check')
await denied('file days: 3 to 5 only', () => as(ids.admin, `update public.settings set file_days = 6`), 'check')
await ok('admin keeps files for 5 days', () => as(ids.admin, `update public.settings set file_days = 5 returning file_days`))
await denied('students cannot change it', async () => { const r = await as(ids.stu, `update public.settings set file_days = 3 returning file_days`); if (!r.length) throw new Error('0 rows (RLS)') })
await ok('the hourly tidy-up calls tidy-files with the secret', async () => {
  await db.query(`truncate net.sent`)
  await db.query(`select public.tidy_message_files()`)
  const r = (await db.query(`select url, headers from net.sent`)).rows[0]
  return eq([r.url, r.headers['x-push-secret']], ['https://example.test/tidy-files', 's3cret'], 'request')
})
await denied('signed-in users cannot list orphan files', () => as(ids.admin, `select public.orphan_attachments(now())`), 'permission denied')

console.log('\nauto-decline')
const openApp = async () => (await db.query(`select id from public.applications where student_id=$1 and status in ('pending','under_review')`, [ids.stu2])).rows[0]?.id
const backdate = id => db.query(`update public.applications set submitted_at = now() - interval '2 days' where id=$1`, [id])
await ok('below the minimum is let in now', async () => {
  await as(ids.admin, `select public.decide_application($1, false, 'Closing this one')`, [await openApp()])
  return as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":60}]') is not null ok`, [path2])
})
await denied('admin cannot approve when no mark meets the minimum', async () => as(ids.admin, `select public.decide_application($1, true, 'Yes')`, [await openApp()]), 'None of their marks meet the 75% minimum')
await ok('switched off: nothing is declined', async () => { await backdate(await openApp()); return eq((await db.query(`select public.auto_decline_applications() n`)).rows[0].n, 0, 'declined') })
await denied('students cannot switch the filter on', async () => { const r = await as(ids.stu, `update public.settings set auto_decline = true returning auto_decline`); if (!r.length) throw new Error('0 rows (RLS)') })
await ok('switched on: declined after a day, with a note and a notification', async () => {
  await as(ids.admin, `update public.settings set auto_decline = true`)
  await db.query(`truncate net.sent`)
  const id = await openApp()
  eq((await db.query(`select public.auto_decline_applications() n`)).rows[0].n, 1, 'declined')
  const r = (await as(ids.stu2, `select status::text, response_message from public.applications where id=$1`, [id]))[0]
  eq(r.status, 'rejected', 'status')
  if (!r.response_message.includes('at least 75%')) throw new Error('note: ' + r.response_message)
  return eq((await lastPush()).title, 'Your tutoring application', 'push')
})
await ok('a new one is left alone for the first day', async () => {
  await as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":60}]')`, [path2])
  return eq((await db.query(`select public.auto_decline_applications() n`)).rows[0].n, 0, 'declined')
})
await ok('one module over the minimum keeps it in; approving adds only that module', async () => {
  await db.query(`update public.modules set high_risk = true where code='MATH1111'`)
  await as(ids.admin, `select public.decide_application($1, false, 'Closing')`, [await openApp()])
  await as(ids.stu2, `select public.submit_application($1, '[{"module_code":"PROG1111","mark":60},{"module_code":"MATH1111","mark":80}]')`, [path2])
  const id = await openApp(); await backdate(id)
  eq((await db.query(`select public.auto_decline_applications() n`)).rows[0].n, 0, 'declined')
  await as(ids.admin, `select public.decide_application($1, true, 'Welcome')`, [id])
  return eq((await db.query(`select module_code from public.tutor_modules where tutor_id=$1`, [ids.stu2])).rows.map(r => r.module_code), ['MATH1111'], 'tutor modules')
})
await denied('signed-in users cannot run the filter', () => as(ids.admin, `select public.auto_decline_applications()`), 'permission denied')

console.log('\nattendance')
const S3 = '00000000-0000-0000-0000-000000000031', S4 = '00000000-0000-0000-0000-000000000032', S5 = '00000000-0000-0000-0000-000000000033'
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'st30000031@rcconnect.edu.za', '{"name":"Thandi Three"}'), ($2, 'st30000032@rcconnect.edu.za', '{"name":"Four Student"}'), ($3, 'st30000033@rcconnect.edu.za', '{"name":"Five Student"}')`, [S3, S4, S5])
await db.query(`update public.profiles set student_number = 'ST300000' || right(id::text, 2) where id in ($1, $2, $3)`, [S3, S4, S5])
await db.query(`update public.profiles set qualification_code = 'DISD' where id in ($1, $2)`, [S4, S5])
const today = (await db.query(`select (now() at time zone 'Africa/Johannesburg')::date::text d`)).rows[0].d
const live = async (sid, who = ids.stu) => (await as(who, `select public.tutor_checkin_live($1) r`, [sid]))[0].r
let cls, onl
await ok("tutor starts a class check-in: today's planned session is used, 1.5 hours", async () => {
  const planned = (await db.query(`select id from public.sessions where tutor_id = $1 and session_date = $2 and status = 'scheduled'`, [ids.stu, today])).rows[0].id
  cls = (await as(ids.stu, `select public.tutor_start_checkin('PROG1111', 'Lab 3', 1.5, 'class') id`))[0].id
  eq(cls, planned, 'session')
  return eq((await db.query(`select status::text, venue, hours::float from public.sessions where id = $1`, [cls])).rows[0], { status: 'logged', venue: 'Lab 3', hours: 1.5 }, 'session')
})
await ok('the tutor can find their open check-in', async () => eq((await as(ids.stu, `select public.tutor_open_checkin() id`))[0].id, cls, 'open'))
await denied('only one open check-in at a time', () => as(ids.stu, `select public.tutor_start_checkin('PROG1111', '', 1, 'class')`), 'already have a check-in open')
await denied('not for a module they don\'t tutor', () => as(ids.stu, `select public.tutor_start_checkin('NETW1111', '', 1, 'class')`), "don't teach or tutor")
await denied('students cannot see the live code', () => live(cls, S3), 'Session not found')
await ok('the live screen has a QR token and a 6-letter code', async () => {
  const r = await live(cls)
  if (!/^[0-9a-f-]{36}\.\d+\.[0-9a-f]{12}$/.test(r.token) || !/^[A-Z2-9]{6}$/.test(r.code) || !r.open) throw new Error(JSON.stringify(r))
})
await denied('a student needs a qualification first', async () => as(S3, `select public.check_in($1)`, [(await live(cls)).token]), 'Choose your qualification first')
await ok('student scans: details come from their account', async () => {
  await as(S3, `update public.profiles set qualification_code = 'DISD' where id = $1`, [S3])
  const r = (await as(S3, `select public.check_in($1) r`, ['https://x.test/tutorlink/?checkin=' + (await live(cls)).token]))[0].r
  eq([r.module_code, r.already], ['PROG1111', false], 'result')
  eq((await db.query(`select student_number, full_name, qualification_code, method from public.attendance where student_id = $1`, [S3])).rows[0],
    { student_number: 'ST30000031', full_name: 'Thandi Three', qualification_code: 'DISD', method: 'qr' }, 'row')
  return eq((await db.query(`select count(*)::int n from public.student_modules where student_id = $1 and module_code = 'PROG1111'`, [S3])).rows[0].n, 1, 'module added')
})
await ok('scanning twice just says so', async () => eq((await as(S3, `select public.check_in($1) r`, [(await live(cls)).token]))[0].r.already, true, 'already'))
await denied('an old QR stops working', async () => {
  const t = (await db.query(`select $1::text || '.' || (public.checkin_window() - 10) || '.' || public.checkin_sig(secret, $1::uuid, public.checkin_window() - 10) t from public.checkins where session_id = $1::uuid`, [cls])).rows[0].t
  return as(S4, `select public.check_in($1)`, [t])
}, 'expired')
await denied('a made-up code is refused', async () => as(S4, `select public.check_in($1)`, [(await live(cls)).token.slice(0, -1) + 'x']), "isn't a TutorLink")
await ok('typing the 6-letter code works too', async () => {
  await as(S4, `select public.check_in_code($1)`, [(await live(cls)).code.toLowerCase()])
  return eq((await db.query(`select method from public.attendance where student_id = $1`, [S4])).rows[0].method, 'code', 'method')
})
await denied('a tutor cannot check in to their own session', async () => as(ids.stu, `select public.check_in($1)`, [(await live(cls)).token]), 'own session')
await denied('lecturers cannot check in', async () => as(ids.lect, `select public.check_in($1)`, [(await live(cls)).token]), 'Only students')
await denied('nobody writes attendance directly', () => as(S5, `insert into public.attendance (session_id, student_number, full_name, method) values ($1, 'ST30000033', 'Five', 'qr')`, [cls]))
await denied('signed-in users cannot make codes themselves', () => as(S3, `select public.checkin_sig(gen_random_uuid(), gen_random_uuid(), 1)`), 'permission denied')
await ok('who sees it: the student their own, tutor and lecturer all, others none', async () => {
  eq((await as(S3, `select id from public.attendance`)).length, 1, 'student')
  eq((await as(ids.stu, `select id from public.attendance`)).length, 2, 'tutor')
  eq((await as(ids.lect, `select id from public.attendance`)).length, 2, 'lecturer')
  eq((await as(ids.lect2, `select id from public.attendance`)).length, 0, 'other lecturer')
  return eq((await as(ids.stu2, `select id from public.attendance`)).length, 0, 'other tutor')
})
await ok('admin cannot confirm with fewer than the minimum', async () => {
  await as(ids.admin, `update public.settings set min_attendance = 3`)
  try { await as(ids.admin, `update public.sessions set status = 'confirmed' where id = $1`, [cls]); throw new Error('was allowed') }
  catch (e) { if (!e.message.includes('at least 3 students')) throw e }
})
await ok('tutor adds a student by number (labelled manual)', async () => {
  await as(ids.stu, `select public.tutor_add_attendance($1, 'st30000033', '', '')`, [cls])
  return eq((await db.query(`select full_name, method, added_by = $2 as by_tutor from public.attendance where session_id = $1 and student_number = 'ST30000033'`, [cls, ids.stu])).rows[0],
    { full_name: 'Five Student', method: 'manual', by_tutor: true }, 'row')
})
await ok('and someone without an account, by name', async () => {
  await as(ids.stu, `select public.tutor_add_attendance($1, 'ST39999999', 'Lerato Paper', 'DISD')`, [cls])
  return eq((await db.query(`select students_attended from public.sessions where id = $1`, [cls])).rows[0].students_attended, 4, 'count')
})
await denied('not twice', () => as(ids.stu, `select public.tutor_add_attendance($1, 'ST39999999', 'Lerato Paper', '')`, [cls]), 'already on the list')
await denied('a name is needed when there is no account', () => as(ids.stu, `select public.tutor_add_attendance($1, 'ST39999998', '', '')`, [cls]), 'name and surname')
await ok('tutor takes one off again', async () => {
  const [{ id }] = (await db.query(`select id from public.attendance where student_number = 'ST39999999'`)).rows
  await as(ids.stu, `select public.tutor_remove_attendance($1)`, [id])
  return eq((await db.query(`select students_attended from public.sessions where id = $1`, [cls])).rows[0].students_attended, 3, 'count')
})
await ok('with 3 checked in, admin confirms; pay = rate x 1.5 hours', async () => {
  await as(ids.admin, `update public.settings set rate_per_session = 200`)
  await as(ids.admin, `update public.sessions set status = 'confirmed' where id = $1`, [cls])
  return eq((await db.query(`select amount::float from public.sessions where id = $1`, [cls])).rows[0].amount, 300, 'amount')
})
await ok('a session past midnight counts the right hours (23:30 to 00:30 is 1)', async () => {
  const [{ id }] = await as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at) values ($1, 'PROG1111', $2, '23:30', '00:30') returning id`, [ids.stu, today])
  return eq((await db.query(`select hours::float from public.sessions where id = $1`, [id])).rows[0].hours, 1, 'hours')
})
await denied('the list is locked once confirmed', () => as(ids.stu, `select public.tutor_add_attendance($1, 'ST30000032', '', '')`, [cls]), 'already confirmed')
await ok('the projector screen works without signing in, and shows no secrets', async () => {
  const [{ display_id }] = (await db.query(`select display_id from public.checkins where session_id = $1`, [cls])).rows
  await db.exec('begin'); await db.exec('set local role anon')
  try {
    const r = (await db.query(`select public.checkin_display($1) r`, [display_id])).rows[0].r
    if (!r.open || r.module_name !== 'Programming 1' || r.display_id || r.secret) throw new Error(JSON.stringify(r))
  } finally { await db.exec('rollback') }
})
await ok('closing it stops check-ins and the projector screen', async () => {
  await as(ids.stu, `select public.tutor_close_checkin($1)`, [cls])
  const [{ display_id }] = (await db.query(`select display_id from public.checkins where session_id = $1`, [cls])).rows
  eq((await as(S5, `select public.checkin_display($1) r`, [display_id]))[0].r.open, false, 'display')
  eq((await as(ids.stu, `select public.tutor_open_checkin() id`))[0].id, null, 'none open')
  try { await as(S5, `select public.check_in($1)`, [(await live(cls)).token]); throw new Error('was allowed') }
  catch (e) { if (!e.message.includes('closed')) throw e }
})
await denied('check-in stays open 5 to 20 minutes', () => as(ids.stu, `select public.tutor_start_checkin('PROG1111', 'Teams', 1, 'online', 25)`), '5 to 20 minutes')
await ok('online: a 4-digit code, open for the 5 minutes chosen', async () => {
  onl = (await as(ids.stu, `select public.tutor_start_checkin('PROG1111', 'Teams', 1, 'online', 5) id`))[0].id
  const mins = (await db.query(`select extract(epoch from closes_at - now()) / 60 m from public.checkins where session_id = $1`, [onl])).rows[0].m
  if (mins < 4.9 || mins > 5.1) throw new Error('open for ' + mins)
  const r = await live(onl)
  if (r.mode !== 'online' || !/^\d{4}$/.test(r.online_code)) throw new Error(JSON.stringify(r))
  await as(S3, `select public.check_in_code($1)`, [r.online_code])
  return eq((await db.query(`select method from public.attendance where session_id = $1`, [onl])).rows[0].method, 'online', 'method')
})
await denied('a forwarded online code stops working after a minute', async () => {
  const old = (await db.query(`select public.checkin_pin(secret, $1::uuid, floor(extract(epoch from now()) / 30)::bigint - 3) p from public.checkins where session_id = $1::uuid`, [onl])).rows[0].p
  const cur = (await live(onl)).online_code
  if (old === cur) return as(S4, `select public.check_in_code('xxxx')`)
  return as(S4, `select public.check_in_code($1)`, [old])
}, "isn't right or has expired")
await ok('the online screen shows no QR', async () => { const r = await live(onl); if (r.token || r.code) throw new Error(JSON.stringify(r)) })
await ok("the student's progress: sessions they came to out of those held", async () => {
  await as(ids.stu, `select public.tutor_close_checkin($1)`, [onl])
  const r = (await as(S3, `select * from public.my_attendance() where module_code = 'PROG1111'`))[0]
  if (r.attended !== 2 || r.held < 2) throw new Error(JSON.stringify(r))
  return r
})
await ok('a session moved to another day that week is reused, not added', async () => {
  const wk = (await db.query(`select date_trunc('week', $1::date)::date::text d`, [today])).rows[0].d
  const other = (await db.query(`select (case when $1::date = $2::date then $1::date + 1 else $2::date end)::text d`, [today, wk])).rows[0].d
  await db.query(`insert into public.semesters (name, starts_on, ends_on) select 'Week', $1::date - 7, $1::date + 7 where not exists (select 1 from public.semesters where $2::date between starts_on and ends_on)`, [today, other])
  const [{ id: planned }] = await as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at) values ($1, 'MATH1111', $2, '10:00', '11:00') returning id`, [ids.stu2, other])
  const before = (await db.query(`select count(*)::int n from public.sessions where tutor_id = $1`, [ids.stu2])).rows[0].n
  const got = (await as(ids.stu2, `select public.tutor_start_checkin('MATH1111', 'Lab 1', 1, 'class') id`))[0].id
  eq(got, planned, 'session reused')
  eq((await db.query(`select session_date::text d from public.sessions where id = $1`, [got])).rows[0].d, today, 'moved to today')
  return eq((await db.query(`select count(*)::int n from public.sessions where tutor_id = $1`, [ids.stu2])).rows[0].n, before, 'no extra session')
})

console.log('\nattendance views')
const semNow = (await db.query(`select semester_id from public.sessions where id = $1`, [cls])).rows[0].semester_id
await ok('lecturer sees only their modules', async () => {
  const mods = (await as(ids.lect, `select module_code from public.attendance_summary($1)`, [semNow])).map(r => r.module_code)
  return eq(mods, ['PROG1111'], 'modules')
})
await ok('admin sees every module, and different students across them', async () => {
  const mods = (await as(ids.admin, `select module_code from public.attendance_summary($1)`, [semNow])).map(r => r.module_code)
  if (!mods.includes('PROG1111') || !mods.includes('MATH1111')) throw new Error(mods.join())
  const [t] = await as(ids.admin, `select * from public.attendance_totals($1)`, [semNow])
  if (t.students !== 3 || t.checkins < 4) throw new Error(JSON.stringify(t))
  return t
})
await ok('a tutor only counts their own sessions', async () => {
  const mods = (await as(ids.stu2, `select module_code from public.attendance_summary($1)`, [semNow])).map(r => r.module_code)
  return eq(mods, ['MATH1111'], 'modules')
})
await ok('the module roster: each student, sessions attended out of held', async () => {
  const rows = await as(ids.lect, `select student_number, attended, held from public.attendance_roster($1, 'PROG1111')`, [semNow])
  const s3 = rows.find(r => r.student_number === 'ST30000031')
  if (!s3 || s3.attended !== 2 || s3.held < 2) throw new Error(JSON.stringify(rows))
  return rows.length
})
await ok("a student's rate only counts their own tutor's sessions", async () => {
  // Another tutor runs a PROG1111 session S3 never goes to: S3's "held" mustn't change.
  const before = (await as(S3, `select held from public.my_attendance() where module_code = 'PROG1111'`))[0].held
  await db.query(`insert into public.tutor_modules values ($1, 'PROG1111') on conflict do nothing`, [ids.stu2])
  await as(ids.admin, `insert into public.sessions (tutor_id, module_code, session_date, starts_at, ends_at, status) values ($1, 'PROG1111', $2, '08:00', '09:00', 'logged')`, [ids.stu2, today])
  eq((await as(S3, `select held from public.my_attendance() where module_code = 'PROG1111'`))[0].held, before, 'held')
  return eq((await as(ids.lect, `select held from public.attendance_roster($1, 'PROG1111') where student_number = 'ST30000031'`, [semNow]))[0].held, before, 'roster held')
})
await ok('notifications: a phone moves to whoever signs in on it', async () => {
  await as(ids.admin, `select public.claim_push('https://push.test/phone-1', 'k', 'a', 'iPhone')`)
  await as(S3, `select public.claim_push('https://push.test/phone-1', 'k', 'a', 'iPhone')`)
  return eq((await db.query(`select user_id from public.push_subscriptions where endpoint = 'https://push.test/phone-1'`)).rows.map(r => r.user_id), [S3], 'owner')
})
await ok('another lecturer gets nothing for it', async () => eq((await as(ids.lect2, `select * from public.attendance_roster($1, 'PROG1111')`, [semNow])).length, 0, 'rows'))
await ok('a student only ever counts themselves', async () => eq((await as(S4, `select * from public.attendance_roster($1, 'PROG1111')`, [semNow])).filter(r => r.student_number !== 'ST30000032').length, 0, 'others'))

console.log('\nlectures and session titles')
let lec
await denied('a check-in needs a title', () => as(ids.lect, `select public.start_checkin('PROG1111', '', 'Loops', 'Hall A', 1, 'class', 10)`), 'Give the session a title')
await denied('and a topic', () => as(ids.lect, `select public.start_checkin('PROG1111', 'Revision', ' ', 'Hall A', 1, 'class', 10)`), 'what the session is about')
await denied('only for a module they teach', () => as(ids.lect2, `select public.start_checkin('PROG1111', 'Revision', 'Loops', 'Hall A', 1, 'class', 10)`), "don't teach or tutor")
await ok('a lecturer starts a lecture check-in, no slot needed', async () => {
  lec = (await as(ids.lect, `select public.start_checkin('PROG1111', 'Revision', 'Loops and arrays', 'Hall A', 1.5, 'class', 10) id`))[0].id
  return eq((await db.query(`select kind, title, topic, status::text, tutor_id = $2 as runs_it from public.sessions where id = $1`, [lec, ids.lect])).rows[0],
    { kind: 'lecture', title: 'Revision', topic: 'Loops and arrays', status: 'logged', runs_it: true }, 'lecture')
})
await ok('a student checks in and sees the title', async () => {
  const r = (await as(S4, `select public.check_in_code($1) r`, [(await live(lec, ids.lect)).code]))[0].r
  return eq([r.kind, r.title, r.topic], ['lecture', 'Revision', 'Loops and arrays'], 'result')
})
await denied('lectures are never confirmed or paid', () => as(ids.admin, `update public.sessions set status = 'confirmed' where id = $1`, [lec]), "Lectures aren't confirmed")
await ok("lectures don't mix with tutorial attendance", async () => {
  const tut = (await as(ids.lect, `select module_code from public.attendance_summary($1)`, [semNow])).map(r => r.module_code)
  const lecs = await as(ids.lect, `select module_code, students from public.attendance_summary($1, 'lecture')`, [semNow])
  eq(lecs, [{ module_code: 'PROG1111', students: 1 }], 'lecture summary')
  const mine = await as(S4, `select kind, attended from public.my_attendance() where module_code = 'PROG1111' order by kind`)
  if (!mine.some(r => r.kind === 'lecture' && r.attended === 1)) throw new Error(JSON.stringify(mine))
  return tut
})
await ok('tutors title their check-ins too', async () => {
  await as(ids.lect, `select public.tutor_close_checkin($1)`, [lec])
  const open = (await as(ids.stu2, `select public.tutor_open_checkin() id`))[0].id
  if (open) await as(ids.stu2, `select public.tutor_close_checkin($1)`, [open])
  const id = (await as(ids.stu2, `select public.start_checkin('MATH1111', 'Test prep', 'Matrices', 'Lab 1', 1, 'class', 5) id`))[0].id
  await as(ids.stu2, `select public.tutor_close_checkin($1)`, [id])
  return eq((await db.query(`select kind, title from public.sessions where id = $1`, [id])).rows[0], { kind: 'tutorial', title: 'Test prep' }, 'tutorial')
})

console.log('\nqualifications and modules')
const S6 = '00000000-0000-0000-0000-000000000041'
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'ST40000041@RCconnect.edu.za', '{"name":"Nandi New"}')`, [S6])
await db.query(`update public.profiles set student_number = 'ST40000041' where id = $1`, [S6])
await ok("a student picks qualification and year: that year's modules are added", async () => {
  eq((await as(S6, `select public.set_my_study('DISD0601', 2) n`))[0].n, 8, 'added')
  const p = (await db.query(`select qualification_code, study_year from public.profiles where id = $1`, [S6])).rows[0]
  eq(p, { qualification_code: 'DISD0601', study_year: 2 }, 'profile')
  return eq((await db.query(`select count(*)::int n from public.student_modules where student_id = $1 and module_code = 'HCIN6222'`, [S6])).rows[0].n, 1, 'HCIN6222')
})
await ok('electives are not added for them', async () => {
  await as(S6, `select public.set_my_study('HCEC0501', 1)`)
  return eq((await db.query(`select count(*)::int n from public.student_modules where student_id = $1 and module_code = 'COZU5112'`, [S6])).rows[0].n, 0, 'isiZulu')
})
await denied('only from the official list', () => as(S6, `select public.set_my_study('NOPE01', 1)`), 'from the list')
await denied('lecturers do not have a qualification', () => as(ids.lect, `select public.set_my_study('DISD0601', 1)`), 'Only students')
await ok("who's missing: enrolled students with no check-in, for the module's lecturer", async () => {
  await db.query(`insert into public.student_modules values ($1, 'PROG1111') on conflict do nothing`, [S6])
  const rows = await as(ids.lect, `select student_number, held from public.module_missing($1, 'PROG1111')`, [semNow])
  if (!rows.some(r => r.student_number === 'ST40000041')) throw new Error(JSON.stringify(rows))
  if (rows.some(r => r.student_number === 'ST30000031')) throw new Error('lists someone who came')
  return rows.length
})
await ok('other lecturers and students get nothing', async () => {
  eq((await as(ids.lect2, `select * from public.module_missing($1, 'PROG1111')`, [semNow])).length, 0, 'lect2')
  return eq((await as(S3, `select * from public.module_missing($1, 'PROG1111')`, [semNow])).length, 0, 'student')
})
await ok('demand per module, for admin', async () => {
  const [r] = await as(ids.admin, `select * from public.module_demand() where module_code = 'IQTT5111'`)
  if (r.qualifications < 10) throw new Error(JSON.stringify(r))
  return r
})
await denied('demand is admin only', () => as(ids.lect, `select * from public.module_demand()`), 'Admin only')
await ok('reach by faculty, from the qualification on each check-in', async () => {
  await db.query(`update public.attendance set qualification_code = 'DISD0601' where student_number = 'ST30000031'`)
  const rows = await as(ids.admin, `select faculty, students from public.attendance_by_faculty($1)`, [semNow])
  if (!rows.some(r => r.faculty === 'Information and Communications Technology' && r.students >= 1)) throw new Error(JSON.stringify(rows))
  return rows
})

console.log('\nRosebank emails')
await denied('a Gmail account cannot sign up', () => db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'someone@gmail.com')`), 'Rosebank student email')
await denied('a staff email cannot sign itself up', () => db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'katshabalala@rbi.ac.za')`), 'Rosebank student email')
await denied('a student-looking email on another domain is refused', () => db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'st10398445@gmail.com')`))
await ok('a student email signs up, and the number comes from it', async () => {
  const [{ id }] = (await db.query(`insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'St10398445@rcconnect.edu.za', '{"full_name":"Kat Student"}') returning id`)).rows
  return eq((await db.query(`select role::text, student_number, email from public.profiles where id = $1`, [id])).rows[0],
    { role: 'student', student_number: 'ST10398445', email: 'st10398445@rcconnect.edu.za' }, 'profile')
})
await ok('the earlier students got their numbers from their emails too', async () => eq((await db.query(`select student_number from public.profiles where id = $1`, [S6])).rows[0].student_number, 'ST40000041', 'number'))
await denied('the same student number cannot sign up twice', () => db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'st10398445@rcconnect.edu.za')`))
await ok('a staff email admin let in can be created', async () => {
  await db.query(`insert into public.staff_invites (email) values ('katshabalala@rbi.ac.za')`)
  const [{ id }] = (await db.query(`insert into auth.users (id, email) values (gen_random_uuid(), 'katshabalala@rbi.ac.za') returning id`)).rows
  return eq((await db.query(`select student_number from public.profiles where id = $1`, [id])).rows[0].student_number, null, 'no student number')
})
await denied('nobody in the app can read the invite list', () => as(ids.admin, `select * from public.staff_invites`))

console.log('\nsigned-out users')
await ok('anon sees nothing', async () => {
  await db.exec('begin'); await db.exec('set local role anon')
  try { return eq((await db.query('select * from public.profiles')).rows.length, 0, 'rows') } finally { await db.exec('rollback') }
})

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED')
process.exit(fails ? 1 : 0)
