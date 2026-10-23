-- ⚠️ DESTRUCTIVE — removes every Ghardailo POS object and all its data.
-- Used only to re-baseline the schema (e.g. switching money from paisa to rupees)
-- before the pilot. Never run after real operations have started.

drop policy if exists "owner uploads product images" on storage.objects;
drop policy if exists "owner updates product images" on storage.objects;
drop policy if exists "owner deletes product images" on storage.objects;

drop view if exists public.sale_balances cascade;
drop view if exists public.customer_balances cascade;
drop view if exists public.cash_expected cascade;

drop function if exists public.customer_ledger(uuid) cascade;
drop function if exists public.customer_balance(uuid) cascade;
drop function if exists public.customers_with_balance() cascade;
drop function if exists public.last_wholesale_prices(uuid) cascade;
drop function if exists public.sales_history(date, date, sale_type, sale_status) cascade;
drop function if exists public.checkout(text, sale_type, uuid, jsonb, jsonb) cascade;
drop function if exists public.record_repayment(uuid, numeric, payment_method, text) cascade;
drop function if exists public.record_repayment(uuid, int, payment_method, text) cascade;
drop function if exists public.void_sale(uuid, text) cascade;
drop function if exists public.can_override() cascade;
drop function if exists public.can_void() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.is_owner() cascade;

drop table if exists public.payment_allocations cascade;
drop table if exists public.payments cascade;
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.cash_checks cascade;
drop table if exists public.audit_events cascade;
drop table if exists public.customers cascade;
drop table if exists public.products cascade;
drop table if exists public.product_categories cascade;
drop table if exists public.staff_profiles cascade;
drop table if exists public.business_settings cascade;

drop sequence if exists public.invoice_seq;

drop type if exists payment_method cascade;
drop type if exists payment_kind cascade;
drop type if exists sale_status cascade;
drop type if exists sale_type cascade;
drop type if exists product_unit cascade;
drop type if exists customer_type cascade;
drop type if exists staff_role cascade;
