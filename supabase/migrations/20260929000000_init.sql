-- ==========================================================================
-- Raisin Finance — schema inicial (Supabase / Postgres)
--
-- Tabelas:
--   profiles      nome e papel (student | admin) de cada conta
--   user_state    progresso nos estudos, gastos e preferências do aluno
--   content       conteúdo dos cursos (uma linha 'main', editada pelo admin)
--   certificates  certificados emitidos pelo servidor (verificáveis)
--
-- Regra geral: o navegador usa a chave anon + JWT do usuário e só enxerga o
-- que as policies abaixo liberam. Certificados são escritos apenas pela Edge
-- Function issue-certificate (service role), nunca pelo navegador.
-- ==========================================================================

-- Nada é acessível por padrão; cada permissão abaixo é explícita.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- --------------------------------------------------------------------------
-- Tabelas
-- --------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 120),
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz not null default now()
);

create table public.user_state (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  study         jsonb not null default '{}'::jsonb,
  expenses      jsonb not null default '[]'::jsonb,
  budget_goal   numeric(12, 2) not null default 2000 check (budget_goal >= 0),
  savings_goal  numeric(12, 2) not null default 500 check (savings_goal >= 0),
  prefs         jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  constraint user_state_study_object check (jsonb_typeof(study) = 'object'),
  constraint user_state_expenses_array check (jsonb_typeof(expenses) = 'array'),
  constraint user_state_prefs_object check (jsonb_typeof(prefs) = 'object'),
  -- ~1 MB por aluno é folga de sobra e impede que alguém use a tabela como depósito.
  constraint user_state_size check (pg_column_size(study) + pg_column_size(expenses) + pg_column_size(prefs) < 1000000)
);
create trigger user_state_updated_at before update on public.user_state
  for each row execute function public.set_updated_at();

create table public.content (
  id          text primary key check (id = 'main'),
  data        jsonb not null check (coalesce(jsonb_typeof(data -> 'courses'), '') = 'array'),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
create trigger content_updated_at before update on public.content
  for each row execute function public.set_updated_at();

create table public.certificates (
  code          text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  course_id     text not null,
  student_name  text not null,
  course_title  text not null,
  hours         integer not null check (hours > 0),
  completed_on  date not null,
  issued_at     timestamptz not null default now(),
  unique (user_id, course_id)
);

-- --------------------------------------------------------------------------
-- Permissões
-- --------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- Cadastro: cria perfil e estado quando nasce um usuário no Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'name', ''), 120));
  insert into public.user_state (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles     enable row level security;
alter table public.user_state   enable row level security;
alter table public.content      enable row level security;
alter table public.certificates enable row level security;

-- profiles: cada um lê o seu, admin lê todos. Só o nome é editável pelo dono;
-- o papel muda apenas via set_user_role().
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

-- user_state: dono lê e grava o próprio; admin só lê.
create policy user_state_read on public.user_state for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_state_update_own on public.user_state for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.user_state to authenticated;
grant update (study, expenses, budget_goal, savings_goal, prefs) on public.user_state to authenticated;

-- content: leitura aberta (inclusive visitante); escrita só admin.
create policy content_read on public.content for select to anon, authenticated
  using (true);
create policy content_admin_insert on public.content for insert to authenticated
  with check (public.is_admin());
create policy content_admin_update on public.content for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.content to anon, authenticated;
grant insert, update on public.content to authenticated;

-- certificates: dono e admin leem; emissão só pelo servidor.
create policy certificates_read on public.certificates for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
grant select on public.certificates to authenticated;

-- --------------------------------------------------------------------------
-- RPCs
-- --------------------------------------------------------------------------

-- Verificação pública do certificado (página do QR Code). Devolve só o que
-- já está impresso no próprio certificado.
create or replace function public.verify_certificate(p_code text)
returns table (code text, student_name text, course_title text, hours integer, completed_on date, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.code, c.student_name, c.course_title, c.hours, c.completed_on, c.issued_at
  from public.certificates c
  where c.code = upper(trim(p_code));
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- Admin promove ou rebaixa contas. Ninguém rebaixa a si mesmo, para o sistema
-- nunca ficar sem administrador.
create or replace function public.set_user_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('student', 'admin') then
    raise exception 'invalid role %', p_role using errcode = '22023';
  end if;
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'cannot demote yourself' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- Painel do admin: alunos com e-mail e progresso numa consulta só.
create or replace function public.admin_students()
returns table (id uuid, email text, name text, role text, created_at timestamptz, study jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.name, p.role, p.created_at, coalesce(s.study, '{}'::jsonb)
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.user_state s on s.user_id = p.id
    order by p.created_at;
end $$;
grant execute on function public.admin_students() to authenticated;

-- --------------------------------------------------------------------------
-- Storage: vídeos e PDFs enviados pelo admin (leitura pública, escrita admin)
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
create policy media_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
create policy media_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
