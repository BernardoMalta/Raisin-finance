// RLS / permissions test for supabase/migrations/*.sql.
// Runs the real migration on PGlite (Postgres compiled to WASM) with a minimal
// stand-in for the Supabase environment: anon/authenticated/service_role roles,
// auth.users, auth.uid() and the storage schema.
//
//   npm i @electric-sql/pglite   (once, anywhere on the module path)
//   node supabase/tests/rls.test.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to service_role;
  alter default privileges in schema public grant all on tables to service_role;
  -- Supabase grants these by default; the migration must revoke what it doesn't want.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text
  );
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant all on storage.objects, storage.buckets to service_role;
`;

const db = new PGlite();
let passed = 0;
let failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS', name); }
  else { failed++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

// Run a block as a given role/user inside a transaction so settings reset.
async function as(role, userId, fn) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId || '']);
    await db.exec(`set local role ${role}`);
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}
async function asCommit(role, userId, fn) {
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId || '']);
    await db.exec(`set local role ${role}`);
    const r = await fn();
    await db.exec('commit');
    return r;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
// Expected failures run inside a savepoint so the surrounding transaction
// (and the role set for it) survives.
async function fails(fn) {
  await db.exec('savepoint expect_fail');
  try {
    await fn();
    await db.exec('release savepoint expect_fail');
    return null;
  } catch (e) {
    await db.exec('rollback to savepoint expect_fail');
    return e.message || String(e);
  }
}

const A = '00000000-0000-4000-8000-00000000000a'; // student
const B = '00000000-0000-4000-8000-00000000000b'; // student
const ADM = '00000000-0000-4000-8000-0000000000ad'; // admin

await db.exec(SUPABASE_STUB);
for (const f of readdirSync(migrationsDir).filter((n) => n.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(migrationsDir, f), 'utf8'));
  console.log('applied', f);
}

// Sign-up trigger
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
  ($1, 'a@t.com', '{"name":"Aluna A"}'), ($2, 'b@t.com', '{"name":"Aluno B"}'), ($3, 'adm@t.com', '{"name":"Admin"}')`, [A, B, ADM]);
await db.query(`update public.profiles set role = 'admin' where id = $1`, [ADM]); // as the SQL editor would
{
  const p = await db.query(`select name, role from public.profiles where id = $1`, [A]);
  const s = await db.query(`select study, expenses from public.user_state where user_id = $1`, [A]);
  check('signup trigger creates profile with name', p.rows[0]?.name === 'Aluna A' && p.rows[0]?.role === 'student', p.rows);
  check('signup trigger creates empty user_state', s.rows.length === 1 && Array.isArray(s.rows[0].expenses), s.rows);
}

// profiles
await as('authenticated', A, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('student sees only own profile', r.rows.length === 1 && r.rows[0].id === A, r.rows);
  await db.query(`update public.profiles set name = 'Aluna A2' where id = $1`, [A]);
  const n = await db.query(`select name from public.profiles where id = $1`, [A]);
  check('student can rename self', n.rows[0].name === 'Aluna A2');
  const err = await fails(() => db.query(`update public.profiles set role = 'admin' where id = $1`, [A]));
  check('student cannot change own role', /permission denied/.test(err || ''), err);
});
await as('authenticated', A, async () => {
  const r = await db.query(`update public.profiles set name = 'hack' where id = $1`, [B]);
  check('student cannot rename others (0 rows)', r.affectedRows === 0, r.affectedRows);
  const err = await fails(() => db.query(`insert into public.profiles (id, name) values (gen_random_uuid(), 'x')`));
  check('student cannot insert profiles', /permission denied/.test(err || ''), err);
  const del = await fails(() => db.query(`delete from public.profiles where id = $1`, [A]));
  check('student cannot delete profiles', /permission denied/.test(del || ''), del);
});
await as('authenticated', ADM, async () => {
  const r = await db.query(`select id from public.profiles`);
  check('admin sees all profiles', r.rows.length === 3, r.rows.length);
});
await as('anon', null, async () => {
  const err = await fails(() => db.query(`select * from public.profiles`));
  check('anon cannot read profiles', /permission denied/.test(err || ''), err);
});

// user_state
await as('authenticated', A, async () => {
  await db.query(`update public.user_state set study = '{"lessons":{"x":{"completed":true}}}', expenses = '[{"id":"e1"}]' where user_id = $1`, [A]);
  const r = await db.query(`select study from public.user_state`);
  check('student reads/writes own state only', r.rows.length === 1 && r.rows[0].study.lessons.x.completed === true, r.rows);
  const other = await db.query(`update public.user_state set study = '{}' where user_id = $1`, [B]);
  check('student cannot write others state (0 rows)', other.affectedRows === 0);
  const err = await fails(() => db.query(`update public.user_state set user_id = $1 where user_id = $2`, [B, A]));
  check('student cannot move state to another user', /permission denied/.test(err || ''), err);
  const bad = await fails(() => db.query(`update public.user_state set expenses = '{}' where user_id = $1`, [A]));
  check('expenses must be an array', /violates check constraint/.test(bad || ''), bad);
  const big = await fails(() => db.query(`update public.user_state set prefs = jsonb_build_object('x', repeat(md5(random()::text), 40000)) where user_id = $1`, [A]));
  check('state size is capped (~1MB)', /violates check constraint/.test(big || ''), big);
});
await as('authenticated', ADM, async () => {
  const r = await db.query(`select user_id from public.user_state`);
  check('admin reads all states', r.rows.length === 3);
  const w = await db.query(`update public.user_state set study = '{}' where user_id = $1`, [A]);
  check('admin cannot write student state', w.affectedRows === 0);
});

// content
const content = JSON.stringify({ courses: [{ id: 'c1', title: 'Curso', modules: [] }] });
await as('authenticated', A, async () => {
  const err = await fails(() => db.query(`insert into public.content (id, data) values ('main', $1)`, [content]));
  check('student cannot write content', /row-level security|permission denied/.test(err || ''), err);
});
await asCommit('authenticated', ADM, async () => {
  await db.query(`insert into public.content (id, data, updated_by) values ('main', $1, $2)
    on conflict (id) do update set data = excluded.data, updated_by = excluded.updated_by`, [content, ADM]);
});
await as('anon', null, async () => {
  const r = await db.query(`select data from public.content where id = 'main'`);
  check('anon reads content', r.rows.length === 1 && r.rows[0].data.courses[0].id === 'c1', r.rows);
  const err = await fails(() => db.query(`update public.content set data = '{"courses":[]}'`));
  check('anon cannot write content', /permission denied|row-level/.test(err || ''), err);
});
await as('authenticated', ADM, async () => {
  const bad = await fails(() => db.query(`update public.content set data = '{"x":1}' where id = 'main'`));
  check('content must keep a courses array', /violates check constraint/.test(bad || ''), bad);
  const upd = await db.query(`update public.content set data = $1 where id = 'main'`, [content]);
  check('admin updates content', upd.affectedRows === 1);
});

// certificates
await db.query(`insert into public.certificates (code, user_id, course_id, student_name, course_title, hours, completed_on)
  values ('RF-ABCDE-23456', $1, 'c1', 'Aluna A', 'Curso', 2, '2026-09-28')`, [A]); // as the edge function (service role) would
await as('authenticated', A, async () => {
  const err = await fails(() => db.query(`insert into public.certificates (code, user_id, course_id, student_name, course_title, hours, completed_on)
    values ('RF-FAKE0-00000', $1, 'c2', 'x', 'x', 1, now())`, [A]));
  check('student cannot forge certificates', /permission denied/.test(err || ''), err);
  const own = await db.query(`select code from public.certificates`);
  check('student sees own certificates', own.rows.length === 1);
});
await as('authenticated', B, async () => {
  const r = await db.query(`select code from public.certificates`);
  check('student does not see others certificates', r.rows.length === 0);
});
await as('anon', null, async () => {
  const ok = await db.query(`select * from public.verify_certificate(' rf-abcde-23456 ')`);
  check('anon verifies certificate by code', ok.rows.length === 1 && ok.rows[0].student_name === 'Aluna A', ok.rows);
  const no = await db.query(`select * from public.verify_certificate('RF-00000-00000')`);
  check('unknown code returns nothing', no.rows.length === 0);
  const err = await fails(() => db.query(`select * from public.certificates`));
  check('anon cannot list certificates', /permission denied/.test(err || ''), err);
});

// RPCs
await as('authenticated', A, async () => {
  const e1 = await fails(() => db.query(`select * from public.admin_students()`));
  check('student cannot call admin_students', /forbidden/.test(e1 || ''), e1);
  const e2 = await fails(() => db.query(`select public.set_user_role($1, 'admin')`, [A]));
  check('student cannot promote self', /forbidden/.test(e2 || ''), e2);
});
await as('anon', null, async () => {
  const e = await fails(() => db.query(`select * from public.admin_students()`));
  check('anon cannot call admin_students', /permission denied|forbidden/.test(e || ''), e);
});
await as('authenticated', ADM, async () => {
  const r = await db.query(`select * from public.admin_students()`);
  check('admin lists students with email', r.rows.length === 3 && r.rows.some((x) => x.email === 'a@t.com'), r.rows.map((x) => x.email));
  await db.query(`select public.set_user_role($1, 'admin')`, [B]);
  const p = await db.query(`select role from public.profiles where id = $1`, [B]);
  check('admin promotes another user', p.rows[0].role === 'admin');
  const e = await fails(() => db.query(`select public.set_user_role($1, 'student')`, [ADM]));
  check('admin cannot demote self', /cannot demote yourself/.test(e || ''), e);
  const e2 = await fails(() => db.query(`select public.set_user_role($1, 'root')`, [B]));
  check('invalid role rejected', /invalid role/.test(e2 || ''), e2);
});
// storage
await as('authenticated', A, async () => {
  const e = await fails(() => db.query(`insert into storage.objects (bucket_id, name) values ('media', 'x.mp4')`));
  check('student cannot upload media', /row-level security/.test(e || ''), e);
});
await as('authenticated', ADM, async () => {
  await db.query(`insert into storage.objects (bucket_id, name) values ('media', 'aulas/x.mp4')`);
  check('admin uploads media', true);
});
{
  const b = await db.query(`select public from storage.buckets where id = 'media'`);
  check('media bucket is public-read', b.rows[0]?.public === true);
}

// cascade on account deletion
await db.query(`delete from auth.users where id = $1`, [A]);
{
  const left = await db.query(`select
    (select count(*) from public.profiles where id = $1) p,
    (select count(*) from public.user_state where user_id = $1) s,
    (select count(*) from public.certificates where user_id = $1) c`, [A]);
  const r = left.rows[0];
  check('deleting the auth user erases all their data', Number(r.p) + Number(r.s) + Number(r.c) === 0, r);
}

console.log(`\n${passed}/${passed + failed} passed`);
process.exit(failed ? 1 : 0);
