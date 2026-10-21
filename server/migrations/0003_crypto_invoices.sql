create table crypto_invoices (
  invoice_id   text primary key,
  user_id      uuid not null references users on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at   timestamptz not null default now()
);
create index crypto_invoices_user on crypto_invoices (user_id, created_at desc);
