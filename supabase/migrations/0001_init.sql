-- Ghardailo POS — initial schema (Phase 2+)
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- All money is numeric rupees with 2 decimals (never floats, never paisa).
-- All dates for reporting use Asia/Kathmandu.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────── enums
create type staff_role      as enum ('owner', 'cashier');
create type customer_type   as enum ('retail', 'wholesale');
create type product_unit    as enum ('litre', 'kg', 'packet', 'piece');
create type sale_type       as enum ('retail', 'wholesale');
create type sale_status     as enum ('posted', 'voided');
create type payment_kind    as enum ('sale_payment', 'repayment', 'refund', 'reversal');
create type payment_method  as enum ('cash', 'online');

-- ─────────────────────────────────────────────────────────── tables

create table staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role staff_role not null default 'cashier',
  can_override_wholesale boolean not null default false,
  can_void boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  phone text,
  type customer_type not null default 'retail',
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_name_idx on customers (lower(name));
create index customers_phone_idx on customers (phone);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  category_id uuid not null references product_categories (id),
  unit product_unit not null,
  retail_price numeric(12, 2) not null check (retail_price >= 0),
  image_path text,
  description text,
  sort_order int not null default 0,
  is_pinned boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on products (category_id, sort_order);

create sequence invoice_seq start 1001;

create table sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no bigint not null unique default nextval('invoice_seq'),
  sale_type sale_type not null,
  customer_id uuid references customers (id),
  status sale_status not null default 'posted',
  total numeric(12, 2) not null check (total >= 0),
  business_date date not null default ((now() at time zone 'Asia/Kathmandu')::date),
  idempotency_key text not null unique,
  created_by uuid not null references staff_profiles (id),
  created_at timestamptz not null default now(),
  voided_by uuid references staff_profiles (id),
  voided_at timestamptz,
  void_reason text,
  constraint wholesale_needs_customer check (sale_type = 'retail' or customer_id is not null),
  constraint void_needs_reason check (
    status = 'posted' or (voided_by is not null and voided_at is not null and length(trim(coalesce(void_reason, ''))) > 0)
  )
);
create index sales_business_date_idx on sales (business_date, status);
create index sales_customer_idx on sales (customer_id, status);
create index sales_created_by_idx on sales (created_by, created_at);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  product_id uuid references products (id),
  product_title text not null,
  unit product_unit not null,
  quantity numeric(10, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  retail_price numeric(12, 2) not null check (retail_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  constraint whole_units_are_whole check (
    unit in ('kg', 'litre') or quantity = trunc(quantity)
  )
);
create index sale_items_sale_idx on sale_items (sale_id);
create index sale_items_product_idx on sale_items (product_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id),
  sale_id uuid references sales (id),
  kind payment_kind not null,
  method payment_method not null,
  amount numeric(12, 2) not null check (amount > 0),
  reference text,
  received_by uuid not null references staff_profiles (id),
  business_date date not null default ((now() at time zone 'Asia/Kathmandu')::date),
  created_at timestamptz not null default now()
);
create index payments_business_date_idx on payments (business_date, method, kind);
create index payments_customer_idx on payments (customer_id);

-- One allocation links one payment to one invoice.
-- Reversal allocations are stored negative so sums always net correctly.
create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete cascade,
  sale_id uuid not null references sales (id),
  amount numeric(12, 2) not null check (amount <> 0),
  created_at timestamptz not null default now()
);
create index payment_allocations_sale_idx on payment_allocations (sale_id);
create index payment_allocations_payment_idx on payment_allocations (payment_id);

create table cash_checks (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  expected_cash numeric(12, 2) not null,
  counted_cash numeric(12, 2) not null check (counted_cash >= 0),
  difference numeric(12, 2) generated always as (counted_cash - expected_cash) stored,
  checked_by uuid not null references staff_profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references staff_profiles (id),
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_created_idx on audit_events (created_at desc);
create index audit_events_action_idx on audit_events (action);

create table business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Ghardailo Dairy',
  contact text default '',
  logo_path text,
  receipt_footer text default 'Thank you!',
  currency text not null default 'NPR',
  updated_at timestamptz not null default now()
);
insert into business_settings (id) values (true);

-- ─────────────────────────────────────────────────────────── permission helpers

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_profiles
    where id = auth.uid() and role = 'owner' and active
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_profiles where id = auth.uid() and active);
$$;

create or replace function public.can_override()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_profiles
    where id = auth.uid() and active and (can_override_wholesale or role = 'owner')
  );
$$;

create or replace function public.can_void()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_profiles
    where id = auth.uid() and active and (can_void or role = 'owner')
  );
$$;

-- ─────────────────────────────────────────────────────────── derived views

create view sale_balances as
select
  s.id,
  s.invoice_no,
  s.customer_id,
  s.sale_type,
  s.business_date,
  s.created_at,
  s.status,
  s.total,
  coalesce(sum(pa.amount), 0)::numeric(12, 2) as paid,
  (s.total - coalesce(sum(pa.amount), 0))::numeric(12, 2) as due
from sales s
left join payment_allocations pa on pa.sale_id = s.id
where s.status = 'posted'
group by s.id;

create view customer_balances as
select
  c.id as customer_id,
  c.name,
  c.phone,
  c.type,
  c.active,
  coalesce(sum(sb.due), 0)::numeric(12, 2) as balance,
  count(sb.id) filter (where sb.due > 0) as open_invoices
from customers c
left join sale_balances sb on sb.customer_id = c.id
group by c.id;

create view cash_expected as
select
  p.business_date,
  coalesce(sum(
    case
      when p.kind in ('sale_payment', 'repayment') then p.amount
      when p.kind in ('refund', 'reversal') then -p.amount
      else 0
    end
  ) filter (where p.method = 'cash'), 0)::numeric(12, 2) as expected_cash
from payments p
group by p.business_date;

-- Views must respect the caller's RLS, not run as the view owner.
alter view sale_balances   set (security_invoker = on);
alter view customer_balances set (security_invoker = on);
alter view cash_expected   set (security_invoker = on);

grant select on sale_balances, customer_balances, cash_expected to authenticated;

create or replace function public.customer_balance(p_customer_id uuid)
returns numeric
language plpgsql stable security definer set search_path = public as $$
declare v numeric;
begin
  if not public.is_staff() then raise exception 'Not an active staff account'; end if;
  select coalesce(sum(due), 0) into v
  from sale_balances where customer_id = p_customer_id;
  return v;
end;
$$;

create or replace function public.customer_ledger(p_customer_id uuid)
returns table (
  entry_date date,
  entry_type text,
  invoice_no bigint,
  sale_id uuid,
  description text,
  debit numeric,
  credit numeric,
  balance numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_running numeric := 0;
  v_row record;
begin
  if not public.is_staff() then raise exception 'Not an active staff account'; end if;

  for v_row in
    with entries as (
      -- credit sales (debits)
      select s.business_date, s.created_at, 'sale'::text as entry_type, s.invoice_no, s.id as sale_id,
             'Invoice ' || s.invoice_no as description,
             s.total as debit, 0::numeric as credit
      from sales s
      where s.customer_id = p_customer_id and s.status = 'posted'
      union all
      -- repayments / sale payments applied to invoices (credits)
      select p.business_date, p.created_at, 'payment'::text, null::bigint, null::uuid,
             initcap(replace(p.method::text, '_', ' ')) || ' ' || replace(p.kind::text, '_', ' '),
             0::numeric, pa.amount
      from payment_allocations pa
      join payments p on p.id = pa.payment_id
      join sales s on s.id = pa.sale_id
      where s.customer_id = p_customer_id
        and s.status = 'posted'
    )
    select * from entries
    order by created_at asc, invoice_no asc nulls last
  loop
    v_running := v_running + v_row.debit - v_row.credit;
    entry_date := v_row.business_date;
    entry_type := v_row.entry_type;
    invoice_no := v_row.invoice_no;
    sale_id := v_row.sale_id;
    description := v_row.description;
    debit := v_row.debit;
    credit := v_row.credit;
    balance := v_running;
    return next;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────── checkout

create or replace function public.checkout(
  p_idempotency_key text,
  p_sale_type sale_type,
  p_customer_id uuid,
  p_items jsonb,
  p_payments jsonb
) returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_existing sales;
  v_sale sales;
  v_item record;
  v_product products;
  v_qty numeric(10, 3);
  v_price numeric(12, 2);
  v_retail numeric(12, 2);
  v_line numeric(12, 2);
  v_total numeric(12, 2) := 0;
  v_pay record;
  v_paid numeric(12, 2) := 0;
  v_method payment_method;
  v_amount numeric(12, 2);
  v_payment_id uuid;
  v_requires_override boolean := false;
begin
  if not public.is_staff() then
    raise exception 'Not an active staff account';
  end if;

  select * into v_existing from sales where idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_sale_type = 'wholesale' and p_customer_id is null then
    raise exception 'Wholesale sales require a customer';
  end if;

  insert into sales (sale_type, customer_id, total, idempotency_key, created_by)
  values (p_sale_type, p_customer_id, 0, p_idempotency_key, v_actor)
  returning * into v_sale;

  for v_item in
    select (e ->> 'product_id')::uuid as product_id,
           (e ->> 'quantity')::numeric as quantity,
           nullif(e ->> 'unit_price', '')::numeric as unit_price
    from jsonb_array_elements(p_items) e
  loop
    select * into v_product from products where id = v_item.product_id and active;
    if not found then
      raise exception 'Product % is not available', v_item.product_id;
    end if;

    v_qty := v_item.quantity;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for %', v_product.title;
    end if;
    if v_product.unit in ('packet', 'piece') and v_qty <> trunc(v_qty) then
      raise exception '% is sold in whole units only', v_product.title;
    end if;

    v_retail := v_product.retail_price;
    v_price := v_retail;

    if p_sale_type = 'wholesale' and v_item.unit_price is not null then
      v_price := round(v_item.unit_price, 2);
      if v_price < 0 then raise exception 'Price cannot be negative'; end if;
      if v_price <> v_retail then
        v_requires_override := true;
      end if;
    end if;

    v_line := round(v_qty * v_price, 2);

    insert into sale_items (
      sale_id, product_id, product_title, unit, quantity,
      unit_price, retail_price, line_total
    ) values (
      v_sale.id, v_product.id, v_product.title, v_product.unit, v_qty,
      v_price, v_retail, v_line
    );

    v_total := v_total + v_line;
  end loop;

  if v_requires_override and not public.can_override() then
    raise exception 'You are not allowed to override wholesale prices';
  end if;

  -- Payments
  if p_payments is not null then
    for v_pay in
      select (e ->> 'method')::payment_method as method,
             (e ->> 'amount')::numeric as amount,
             nullif(e ->> 'reference', '') as reference
      from jsonb_array_elements(p_payments) e
    loop
      v_method := v_pay.method;
      v_amount := round(v_pay.amount, 2);
      if v_method is null or v_amount is null or v_amount <= 0 then
        raise exception 'Invalid payment';
      end if;
      if v_paid + v_amount > v_total then
        raise exception 'Payment exceeds amount due';
      end if;

      insert into payments (customer_id, sale_id, kind, method, amount, reference, received_by)
      values (p_customer_id, v_sale.id, 'sale_payment', v_method, v_amount, v_pay.reference, v_actor)
      returning id into v_payment_id;

      insert into payment_allocations (payment_id, sale_id, amount)
      values (v_payment_id, v_sale.id, v_amount);

      insert into audit_events (actor_id, action, entity_type, entity_id, details)
      values (v_actor, 'payment_received', 'payment', v_payment_id::text,
              jsonb_build_object('sale_id', v_sale.id, 'amount', v_amount, 'method', v_method));

      v_paid := v_paid + v_amount;
    end loop;
  end if;

  if v_paid < v_total and p_customer_id is null then
    raise exception 'A credit sale requires a customer';
  end if;

  update sales set total = v_total where id = v_sale.id returning * into v_sale;

  insert into audit_events (actor_id, action, entity_type, entity_id, details)
  values (
    v_actor, 'sale_created', 'sale', v_sale.id::text,
    jsonb_build_object(
      'invoice_no', v_sale.invoice_no,
      'sale_type', p_sale_type,
      'total', v_total,
      'paid', v_paid,
      'customer_id', p_customer_id
    )
  );

  if v_requires_override then
    insert into audit_events (actor_id, action, entity_type, entity_id, details)
    values (
      v_actor, 'wholesale_price_override', 'sale', v_sale.id::text,
      jsonb_build_object('invoice_no', v_sale.invoice_no)
    );
  end if;

  return v_sale;
end;
$$;

-- ─────────────────────────────────────────────────────────── repayment

create or replace function public.record_repayment(
  p_customer_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_reference text default null
) returns payments
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_customer customers;
  v_outstanding numeric;
  v_payment payments;
  v_sale record;
  v_remaining numeric;
  v_take numeric;
begin
  if not public.is_staff() then
    raise exception 'Not an active staff account';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount greater than zero';
  end if;

  select * into v_customer from customers where id = p_customer_id and active;
  if not found then
    raise exception 'Customer not found or inactive';
  end if;

  select coalesce(sum(due), 0) into v_outstanding
  from sale_balances where customer_id = p_customer_id;

  if v_outstanding <= 0 then
    raise exception 'This customer has no outstanding balance';
  end if;
  if p_amount > v_outstanding then
    raise exception 'Payment exceeds outstanding balance of %', v_outstanding;
  end if;

  insert into payments (customer_id, kind, method, amount, reference, received_by)
  values (p_customer_id, 'repayment', p_method, round(p_amount, 2), p_reference, v_actor)
  returning * into v_payment;

  v_remaining := round(p_amount, 2);
  for v_sale in
    select id, due from sale_balances
    where customer_id = p_customer_id and due > 0
    order by created_at asc, invoice_no asc
  loop
    exit when v_remaining <= 0;
    v_take := least(v_sale.due, v_remaining);
    insert into payment_allocations (payment_id, sale_id, amount)
    values (v_payment.id, v_sale.id, v_take);
    v_remaining := v_remaining - v_take;
  end loop;

  insert into audit_events (actor_id, action, entity_type, entity_id, details)
  values (v_actor, 'repayment_received', 'payment', v_payment.id::text,
          jsonb_build_object('customer_id', p_customer_id, 'amount', p_amount, 'method', p_method));

  return v_payment;
end;
$$;

-- ─────────────────────────────────────────────────────────── void

create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns sales
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_sale sales;
  v_alloc record;
  v_reversal_id uuid;
begin
  if not public.can_void() then
    raise exception 'You are not allowed to void sales';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A void reason is required';
  end if;

  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.status = 'voided' then raise exception 'Sale is already voided'; end if;

  for v_alloc in
    select pa.id, pa.payment_id, pa.amount, p.method, p.customer_id
    from payment_allocations pa
    join payments p on p.id = pa.payment_id
    where pa.sale_id = p_sale_id and pa.amount > 0
  loop
    insert into payments (customer_id, sale_id, kind, method, amount, reference, received_by)
    values (v_alloc.customer_id, p_sale_id, 'reversal', v_alloc.method, v_alloc.amount,
            'Void of invoice ' || v_sale.invoice_no, v_actor)
    returning id into v_reversal_id;

    insert into payment_allocations (payment_id, sale_id, amount)
    values (v_reversal_id, p_sale_id, -v_alloc.amount);
  end loop;

  update sales
  set status = 'voided', voided_by = v_actor, voided_at = now(), void_reason = trim(p_reason)
  where id = p_sale_id
  returning * into v_sale;

  insert into audit_events (actor_id, action, entity_type, entity_id, details)
  values (v_actor, 'sale_voided', 'sale', p_sale_id::text,
          jsonb_build_object('invoice_no', v_sale.invoice_no, 'reason', p_reason));

  return v_sale;
end;
$$;

-- ─────────────────────────────────────────────────────────── RLS

alter table staff_profiles      enable row level security;
alter table customers           enable row level security;
alter table product_categories  enable row level security;
alter table products            enable row level security;
alter table sales               enable row level security;
alter table sale_items          enable row level security;
alter table payments            enable row level security;
alter table payment_allocations enable row level security;
alter table cash_checks         enable row level security;
alter table audit_events        enable row level security;
alter table business_settings   enable row level security;

-- staff
create policy "staff read self" on staff_profiles
  for select using (id = auth.uid() or public.is_owner());
create policy "owner manage staff" on staff_profiles
  for insert with check (public.is_owner());
create policy "owner update staff" on staff_profiles
  for update using (public.is_owner());

-- catalog
create policy "staff read categories" on product_categories
  for select using (public.is_staff());
create policy "owner write categories" on product_categories
  for all using (public.is_owner()) with check (public.is_owner());

create policy "staff read products" on products
  for select using (public.is_staff());
create policy "owner write products" on products
  for all using (public.is_owner()) with check (public.is_owner());

-- customers: cashiers may quick-add, owner manages
create policy "staff read customers" on customers
  for select using (public.is_staff());
create policy "staff add customers" on customers
  for insert with check (public.is_staff());
create policy "owner update customers" on customers
  for update using (public.is_owner());

-- sales: cashiers see their own today, owner sees all
create policy "read sales" on sales
  for select using (
    public.is_owner()
    or (created_by = auth.uid() and business_date = (now() at time zone 'Asia/Kathmandu')::date)
  );

create policy "read sale items" on sale_items
  for select using (
    exists (
      select 1 from sales s
      where s.id = sale_items.sale_id
      and (
        public.is_owner()
        or (s.created_by = auth.uid() and s.business_date = (now() at time zone 'Asia/Kathmandu')::date)
      )
    )
  );

-- payments: owner all; cashier sees payments they received or on today's own sales
create policy "read payments" on payments
  for select using (
    public.is_owner()
    or received_by = auth.uid()
    or exists (
      select 1 from sales s
      where s.id = payments.sale_id
      and s.created_by = auth.uid()
      and s.business_date = (now() at time zone 'Asia/Kathmandu')::date
    )
    or (customer_id is not null and public.is_staff())
  );

create policy "read allocations" on payment_allocations
  for select using (
    exists (
      select 1 from payments p
      where p.id = payment_allocations.payment_id
      and (public.is_owner() or p.received_by = auth.uid())
    )
    or exists (
      select 1 from sales s
      where s.id = payment_allocations.sale_id
      and (public.is_owner() or s.created_by = auth.uid())
    )
  );

-- cash checks + audit + settings
create policy "owner cash checks" on cash_checks
  for all using (public.is_owner()) with check (public.is_owner());

create policy "owner reads audit" on audit_events
  for select using (public.is_owner());

create policy "staff read settings" on business_settings
  for select using (public.is_staff());
create policy "owner writes settings" on business_settings
  for update using (public.is_owner()) with check (public.is_owner());

-- ─────────────────────────────────────────────────────────── storage

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "owner uploads product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_owner());

create policy "owner updates product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_owner());

create policy "owner deletes product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_owner());

-- ─────────────────────────────────────────────────────────── staff-safe RPCs

create or replace function public.customers_with_balance()
returns table (
  id uuid, name text, phone text, type customer_type, active boolean,
  balance numeric, open_invoices bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not an active staff account'; end if;
  return query
    select c.id, c.name, c.phone, c.type, c.active,
           coalesce(sum(sb.due), 0)::numeric(12, 2),
           count(sb.id) filter (where sb.due > 0)
    from customers c
    left join sale_balances sb on sb.customer_id = c.id
    group by c.id
    order by c.active desc, lower(c.name);
end;
$$;

create or replace function public.last_wholesale_prices(p_customer_id uuid)
returns table (product_id uuid, unit_price numeric)
language sql stable security definer set search_path = public as $$
  select distinct on (si.product_id) si.product_id, si.unit_price
  from sale_items si
  join sales s on s.id = si.sale_id
  where s.customer_id = p_customer_id
    and s.sale_type = 'wholesale'
    and s.status = 'posted'
    and si.product_id is not null
  order by si.product_id, s.created_at desc;
$$;

create or replace function public.sales_history(
  p_from date,
  p_to date,
  p_type sale_type default null,
  p_status sale_status default null
)
returns table (
  id uuid,
  invoice_no bigint,
  created_at timestamptz,
  business_date date,
  sale_type sale_type,
  customer_name text,
  status sale_status,
  total numeric,
  paid numeric,
  due numeric,
  cashier_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not an active staff account'; end if;

  return query
    select
      s.id,
      s.invoice_no,
      s.created_at,
      s.business_date,
      s.sale_type,
      c.name,
      s.status,
      s.total,
      coalesce(sum(pa.amount), 0)::numeric(12, 2) as paid,
      case when s.status = 'voided' then 0::numeric
           else (s.total - coalesce(sum(pa.amount), 0))::numeric(12, 2) end as due,
      sp.full_name
    from sales s
    left join customers c on c.id = s.customer_id
    left join payment_allocations pa on pa.sale_id = s.id
    left join staff_profiles sp on sp.id = s.created_by
    where s.business_date between p_from and p_to
      and (p_type is null or s.sale_type = p_type)
      and (p_status is null or s.status = p_status)
      and (
        public.is_owner()
        or (s.created_by = auth.uid() and s.business_date = (now() at time zone 'Asia/Kathmandu')::date)
      )
    group by s.id, c.name, sp.full_name
    order by s.created_at desc;
end;
$$;

-- ─────────────────────────────────────────────────────────── grants

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.checkout(text, sale_type, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.record_repayment(uuid, numeric, payment_method, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.customer_balance(uuid) to authenticated;
grant execute on function public.customer_ledger(uuid) to authenticated;
grant execute on function public.customers_with_balance() to authenticated;
grant execute on function public.last_wholesale_prices(uuid) to authenticated;
grant execute on function public.sales_history(date, date, sale_type, sale_status) to authenticated;

-- ─────────────────────────────────────────────────────────── bootstrap

-- After creating the first auth user in Supabase, promote them:
--   insert into staff_profiles (id, full_name, role)
--   values ('<auth-user-uuid>', 'Owner Name', 'owner');
