-- =====================================================================
-- Controle de Carteira de Projetos: banco de dados (Supabase / Postgres)
-- Cole este script inteiro em Supabase -> SQL Editor -> Run
-- Antes de rodar, troque SEU_EMAIL_AQUI pelo seu e-mail de administrador.
-- =====================================================================

-- 1) TABELAS -----------------------------------------------------------
create table if not exists profiles (
  email     text primary key,                      -- sempre em minúsculas
  nome      text,
  role      text not null default 'leitor' check (role in ('admin','editor','leitor')),
  contratos text[] not null default '{angra,mage}',
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists config (
  chave          text primary key,                 -- url_angra, url_mage, data_inicial
  valor          text,
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

create table if not exists carteira (
  id             uuid primary key default gen_random_uuid(),
  dados          jsonb not null,                   -- uma linha da carteira (colunas livres)
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

create table if not exists access_requests (
  id        uuid primary key default gen_random_uuid(),
  nome      text check (char_length(nome) <= 120),
  email     text not null check (char_length(email) <= 160),
  criado_em timestamptz not null default now()
);

-- 2) FUNÇÃO: perfil de quem está logado -------------------------------
create or replace function public.meu_perfil()
returns text
language sql stable security definer set search_path = public
as $$
  select role from profiles
  where email = lower(auth.jwt() ->> 'email') and ativo
$$;

-- 3) SEGURANÇA (RLS): cada tabela só responde a quem tem permissão ----
alter table profiles        enable row level security;
alter table config          enable row level security;
alter table carteira        enable row level security;
alter table access_requests enable row level security;

-- profiles: cada um lê o próprio; admin lê e altera todos
create policy profiles_ler   on profiles for select to authenticated
  using (email = lower(auth.jwt() ->> 'email') or meu_perfil() = 'admin');
create policy profiles_admin on profiles for all to authenticated
  using (meu_perfil() = 'admin') with check (meu_perfil() = 'admin');

-- config: qualquer usuário liberado lê; só admin altera
create policy config_ler   on config for select to authenticated using (meu_perfil() is not null);
create policy config_admin on config for all to authenticated
  using (meu_perfil() = 'admin') with check (meu_perfil() = 'admin');

-- carteira: usuário liberado lê; editor e admin criam, alteram e excluem
create policy carteira_ler on carteira for select to authenticated using (meu_perfil() is not null);
create policy carteira_esc on carteira for all to authenticated
  using (meu_perfil() in ('admin','editor')) with check (meu_perfil() in ('admin','editor'));

-- solicitações de acesso: qualquer pessoa envia; só admin vê e remove
create policy req_inserir on access_requests for insert to anon, authenticated with check (true);
create policy req_admin   on access_requests for select to authenticated using (meu_perfil() = 'admin');
create policy req_apagar  on access_requests for delete to authenticated using (meu_perfil() = 'admin');

-- 4) DADOS INICIAIS ------------------------------------------------------
insert into profiles (email, nome, role)
values (lower('SEU_EMAIL_AQUI'), 'Administrador', 'admin')
on conflict (email) do nothing;

insert into config (chave, valor) values
  ('data_inicial', '2026-11-01')
on conflict (chave) do nothing;
