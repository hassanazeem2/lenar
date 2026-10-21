-- Card and crypto top-ups share this table. stripe_session_id holds whichever
-- payment id claimed the credit: a Stripe Checkout session, or wp_<WolvPay invoice id>.
alter table topups add column provider text not null default 'card';
alter table topups add constraint topups_provider_check check (provider in ('card', 'crypto'));
