-- TutorLink — core schema
-- Plain-English version: Docs-TLink/Tech/Database.md

create type public.user_role as enum ('student', 'lecturer', 'admin');
create type public.application_status as enum ('pending', 'under_review', 'approved', 'rejected');
create type public.session_status as enum ('scheduled', 'logged', 'confirmed', 'paid', 'cancelled');

/* ---------- people ---------------------------------------- */

-- One row per auth user. Tutors are students with is_tutor = true.
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  role           public.user_role not null default 'student',
  is_tutor       boolean not null default false,
  full_name      text not null default '',
  email          text not null,
  student_number text unique check (student_number ~ '^ST[0-9]{8}$'),
  created_at     timestamptz not null default now(),
  constraint only_students_tutor check (role = 'student' or not is_tutor)
);

/* ---------- modules --------------------------------------- */

-- Grows as students add modules; admin tidies up (rename, merge, hide).
create table public.modules (
  code       text primary key check (code ~ '^[A-Z]{4}[0-9]{4}$'),
  name       text not null check (length(btrim(name)) between 2 and 120),
  hidden     boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.student_modules (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  module_code text not null references public.modules (code) on update cascade on delete cascade,
  primary key (student_id, module_code)
);

create table public.lecturer_modules (
  lecturer_id uuid not null references public.profiles (id) on delete cascade,
  module_code text not null references public.modules (code) on update cascade on delete cascade,
  primary key (lecturer_id, module_code)
);

create table public.tutor_modules (
  tutor_id    uuid not null references public.profiles (id) on delete cascade,
  module_code text not null references public.modules (code) on update cascade on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (tutor_id, module_code)
);

create index on public.student_modules (module_code);
create index on public.lecturer_modules (module_code);
create index on public.tutor_modules (module_code);

/* ---------- applications ---------------------------------- */

create table public.applications (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles (id) on delete cascade,
  status             public.application_status not null default 'pending',
  results_path       text not null,   -- storage: results/<student_id>/<file>
  background_checked boolean not null default false,
  response_message   text,
  processed_by       uuid references public.profiles (id) on delete set null,
  processed_at       timestamptz,
  submitted_at       timestamptz not null default now()
);

-- One open application per student at a time.
create unique index applications_one_open
  on public.applications (student_id) where status in ('pending', 'under_review');
create index on public.applications (status);

-- Marks the student typed in from their statement of results.
create table public.application_marks (
  application_id uuid not null references public.applications (id) on delete cascade,
  module_code    text not null references public.modules (code) on update cascade,
  mark           smallint not null check (mark between 0 and 100),
  applying       boolean not null default false,  -- wants to tutor this module
  primary key (application_id, module_code)
);

/* ---------- programme settings ---------------------------- */

create table public.settings (
  id               boolean primary key default true check (id),
  rate_per_session numeric(10, 2) not null default 150 check (rate_per_session >= 0),
  min_mark         smallint not null default 75 check (min_mark between 0 and 100),
  updated_at       timestamptz not null default now()
);

create table public.response_templates (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  body       text not null,
  sort_order smallint not null default 0
);

create table public.semesters (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  starts_on      date not null,
  ends_on        date not null,
  session_quota  smallint not null default 24 check (session_quota > 0),
  check (ends_on > starts_on),
  -- Two semesters can never overlap, so every date belongs to at most one.
  constraint semesters_no_overlap exclude using gist (daterange(starts_on, ends_on, '[]') with &&)
);

-- A different quota for one tutor in one semester.
create table public.tutor_quota_overrides (
  tutor_id      uuid not null references public.profiles (id) on delete cascade,
  semester_id   uuid not null references public.semesters (id) on delete cascade,
  session_quota smallint not null check (session_quota >= 0),
  primary key (tutor_id, semester_id)
);

/* ---------- sessions -------------------------------------- */

-- Admin-set weekly slot; sessions are generated from it up to `until`.
create table public.schedule_slots (
  id          uuid primary key default gen_random_uuid(),
  tutor_id    uuid not null references public.profiles (id) on delete cascade,
  module_code text not null references public.modules (code) on update cascade,
  weekday     smallint not null check (weekday between 1 and 7),  -- ISO: 1 = Monday
  starts_at   time not null,
  ends_at     time not null,
  venue       text not null default '',
  starts_on   date not null,
  until       date not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at),
  check (until >= starts_on)
);

create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  tutor_id          uuid not null references public.profiles (id) on delete cascade,
  module_code       text not null references public.modules (code) on update cascade,
  semester_id       uuid not null references public.semesters (id),
  slot_id           uuid references public.schedule_slots (id) on delete set null,
  session_date      date not null,
  starts_at         time,
  ends_at           time,
  venue             text not null default '',
  students_attended smallint check (students_attended >= 0),
  status            public.session_status not null default 'scheduled',
  logged_at         timestamptz,
  confirmed_by      uuid references public.profiles (id) on delete set null,
  confirmed_at      timestamptz,
  rate              numeric(10, 2),  -- frozen when confirmed
  paid_at           timestamptz,
  created_by        uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now()
);

create index on public.sessions (tutor_id, semester_id);
create index on public.sessions (status);
create index on public.sessions (module_code);

create table public.registers (
  id           uuid primary key default gen_random_uuid(),
  tutor_id     uuid not null references public.profiles (id) on delete cascade,
  module_code  text not null references public.modules (code) on update cascade,
  session_id   uuid references public.sessions (id) on delete set null,
  storage_path text not null,  -- storage: registers/<tutor_id>/<file>
  file_name    text not null,
  uploaded_at  timestamptz not null default now()
);

create index on public.registers (tutor_id);

/* ---------- messaging ------------------------------------- */

-- One conversation per pair of people; user_a < user_b keeps it unique.
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index on public.conversations (user_b);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  topic           text not null check (length(btrim(topic)) between 1 and 120),
  body            text not null check (length(btrim(body)) between 1 and 4000),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

create index on public.messages (conversation_id, created_at desc);
create index messages_unread on public.messages (conversation_id) where read_at is null;

/* ---------- push ------------------------------------------ */

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (user_id);
