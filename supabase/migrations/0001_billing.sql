-- lenar billing schema.
-- Money lives on 7api: each customer gets one 7api subkey, and its balance is their credit.
-- This database only tracks which subkey belongs to whom, the Stripe payments that funded it,
-- and spend snapshots for the dashboard chart. Clients never read these tables directly;
-- everything goes through edge functions using the service role.

create table public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  subkey_id   text not null,               -- 7api subkey id, e.g. "sub_1234"
  key_prefix  text not null,               -- safe to show forever, e.g. "sk-abc123…"
  secret_enc  text not null,               -- AES-GCM encrypted key; needed server side to read usage
  needs_reveal boolean not null default true,
  created_at  timestamptz not null default now(),
  revealed_at timestamptz,
  revoked_at  timestamptz
);
create unique index api_keys_one_active_per_user on public.api_keys (user_id) where revoked_at is null;

create table public.topups (
  stripe_session_id text primary key,      -- primary key makes Stripe retries safe
  user_id      uuid not null references auth.users on delete cascade,
  paid_cents   integer not null check (paid_cents > 0),   -- what the customer paid
  credit_cents integer not null check (credit_cents > 0), -- what we moved onto their 7api subkey
  claimed_at   timestamptz,                 -- a webhook delivery is funding it right now
  funded_at    timestamptz,                 -- the subkey has been funded
  created_at   timestamptz not null default now()
);
create index topups_user on public.topups (user_id, created_at desc);

create table public.usage_snapshots (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users on delete cascade,
  spent_usd numeric(14, 6) not null,        -- 7api's cumulative spent_usd across this user's keys
  taken_at  timestamptz not null default now()
);
create index usage_snapshots_user on public.usage_snapshots (user_id, taken_at desc);

-- Records a top-up (once) and claims it for funding.
-- Returns 'claimed' (go fund it), 'funded' (already done) or 'busy' (another delivery is on it).
create function public.claim_topup(p_session text, p_user uuid, p_paid integer, p_credit integer)
returns text language plpgsql security definer set search_path = public as $$
declare row public.topups;
begin
  insert into public.topups (stripe_session_id, user_id, paid_cents, credit_cents)
  values (p_session, p_user, p_paid, p_credit)
  on conflict (stripe_session_id) do nothing;

  update public.topups set claimed_at = now()
  where stripe_session_id = p_session
    and funded_at is null
    and (claimed_at is null or claimed_at < now() - interval '2 minutes')
  returning * into row;
  if found then return 'claimed'; end if;

  select * into row from public.topups where stripe_session_id = p_session;
  return case when row.funded_at is not null then 'funded' else 'busy' end;
end $$;

-- Lock everything down: only the service role (edge functions) touches these tables.
alter table public.api_keys        enable row level security;
alter table public.topups          enable row level security;
alter table public.usage_snapshots enable row level security;
revoke all on public.api_keys, public.topups, public.usage_snapshots from anon, authenticated;
revoke execute on function public.claim_topup from public, anon, authenticated;
