-- 0002 — Phase 3 controls: reports, audit triggers, export/login logging.
-- Run after 0001. Safe to re-run (create or replace / drop trigger if exists).

-- ─────────────────────────────────────────────────────────── reports
-- All report functions are owner-only and read persisted records only.

create or replace function public.report_sales(
  p_from date,
  p_to date,
  p_group text default 'day'
)
returns table (
  period_start date,
  retail_total numeric,
  wholesale_total numeric,
  retail_count bigint,
  wholesale_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  if p_group not in ('day', 'week', 'month') then raise exception 'Invalid grouping'; end if;

  return query
    select
      date_trunc(p_group, s.business_date)::date as period_start,
      coalesce(sum(case when s.sale_type = 'retail' then s.total else 0 end), 0)::numeric(14, 2),
      coalesce(sum(case when s.sale_type = 'wholesale' then s.total else 0 end), 0)::numeric(14, 2),
      count(*) filter (where s.sale_type = 'retail'),
      count(*) filter (where s.sale_type = 'wholesale')
    from sales s
    where s.status = 'posted' and s.business_date between p_from and p_to
    group by 1
    order by 1;
end;
$$;

create or replace function public.report_collections(p_from date, p_to date)
returns table (
  business_date date,
  cash numeric,
  online numeric,
  repayments numeric,
  total numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select
      p.business_date,
      coalesce(sum(case
        when p.method = 'cash' and p.kind in ('sale_payment', 'repayment') then p.amount
        when p.method = 'cash' and p.kind in ('refund', 'reversal') then -p.amount
        else 0 end), 0)::numeric(14, 2) as cash,
      coalesce(sum(case
        when p.method = 'online' and p.kind in ('sale_payment', 'repayment') then p.amount
        when p.method = 'online' and p.kind in ('refund', 'reversal') then -p.amount
        else 0 end), 0)::numeric(14, 2) as online,
      coalesce(sum(case when p.kind = 'repayment' then p.amount else 0 end), 0)::numeric(14, 2) as repayments,
      coalesce(sum(case
        when p.kind in ('sale_payment', 'repayment') then p.amount
        when p.kind in ('refund', 'reversal') then -p.amount
        else 0 end), 0)::numeric(14, 2) as total
    from payments p
    where p.business_date between p_from and p_to
    group by p.business_date
    order by p.business_date;
end;
$$;

create or replace function public.report_outstanding()
returns table (
  customer_id uuid,
  customer_name text,
  phone text,
  customer_type customer_type,
  invoice_no bigint,
  business_date date,
  total numeric,
  paid numeric,
  due numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select c.id, c.name, c.phone, c.type, sb.invoice_no, sb.business_date, sb.total, sb.paid, sb.due
    from sale_balances sb
    join customers c on c.id = sb.customer_id
    where sb.due > 0
    order by c.name, sb.created_at;
end;
$$;

create or replace function public.report_outstanding_by_customer()
returns table (
  customer_id uuid,
  customer_name text,
  phone text,
  customer_type customer_type,
  open_invoices bigint,
  balance numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select c.id, c.name, c.phone, c.type,
           count(sb.id) filter (where sb.due > 0),
           coalesce(sum(sb.due), 0)::numeric(14, 2)
    from customers c
    left join sale_balances sb on sb.customer_id = c.id
    group by c.id
    having coalesce(sum(sb.due), 0) > 0
    order by coalesce(sum(sb.due), 0) desc;
end;
$$;

create or replace function public.report_products(p_from date, p_to date)
returns table (
  product_title text,
  unit product_unit,
  quantity numeric,
  value numeric,
  sale_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select si.product_title, si.unit,
           sum(si.quantity)::numeric(14, 3),
           sum(si.line_total)::numeric(14, 2),
           count(distinct si.sale_id)
    from sale_items si
    join sales s on s.id = si.sale_id
    where s.status = 'posted' and s.business_date between p_from and p_to
    group by si.product_id, si.product_title, si.unit
    order by sum(si.line_total) desc;
end;
$$;

create or replace function public.report_wholesale(p_from date, p_to date)
returns table (
  wholesale_total numeric,
  retail_value numeric,
  discount numeric,
  sale_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select
      coalesce(sum(x.total), 0)::numeric(14, 2),
      coalesce(sum(x.retail_value), 0)::numeric(14, 2),
      coalesce(sum(x.retail_value - x.total), 0)::numeric(14, 2),
      count(*)
    from (
      select s.id, s.total, sum(si.retail_price * si.quantity) as retail_value
      from sales s
      join sale_items si on si.sale_id = s.id
      where s.status = 'posted'
        and s.sale_type = 'wholesale'
        and s.business_date between p_from and p_to
      group by s.id
    ) x;
end;
$$;

create or replace function public.report_below_retail(p_from date, p_to date)
returns table (
  invoice_no bigint,
  business_date date,
  customer_name text,
  product_title text,
  quantity numeric,
  retail_price numeric,
  unit_price numeric,
  discount numeric,
  staff_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select s.invoice_no, s.business_date, c.name, si.product_title, si.quantity,
           si.retail_price, si.unit_price,
           round((si.retail_price - si.unit_price) * si.quantity, 2) as discount,
           sp.full_name
    from sale_items si
    join sales s on s.id = si.sale_id
    left join customers c on c.id = s.customer_id
    join staff_profiles sp on sp.id = s.created_by
    where s.status = 'posted'
      and s.sale_type = 'wholesale'
      and si.unit_price < si.retail_price
      and s.business_date between p_from and p_to
    order by s.created_at desc;
end;
$$;

create or replace function public.report_voids(p_from date, p_to date)
returns table (
  invoice_no bigint,
  business_date date,
  customer_name text,
  total numeric,
  reason text,
  voided_at timestamptz,
  voided_by_name text,
  created_by_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select s.invoice_no, s.business_date, c.name, s.total, s.void_reason,
           s.voided_at, v.full_name, cr.full_name
    from sales s
    left join customers c on c.id = s.customer_id
    left join staff_profiles v on v.id = s.voided_by
    left join staff_profiles cr on cr.id = s.created_by
    where s.status = 'voided' and s.business_date between p_from and p_to
    order by s.voided_at desc;
end;
$$;

create or replace function public.report_cash_checks(p_from date, p_to date)
returns table (
  business_date date,
  expected_cash numeric,
  counted_cash numeric,
  difference numeric,
  note text,
  checked_by_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select cc.business_date, cc.expected_cash, cc.counted_cash, cc.difference, cc.note, sp.full_name
    from cash_checks cc
    join staff_profiles sp on sp.id = cc.checked_by
    where cc.business_date between p_from and p_to
    order by cc.business_date desc;
end;
$$;

-- ─────────────────────────────────────────────────────────── audit triggers

create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_entity text := tg_table_name;
  v_id text;
  v_details jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'products' then
    if tg_op = 'INSERT' then
      v_action := 'product_created';
      v_details := jsonb_build_object('title', new.title, 'retail_price', new.retail_price);
    elsif new.retail_price is distinct from old.retail_price then
      v_action := 'product_price_changed';
      v_details := jsonb_build_object('title', new.title, 'from', old.retail_price, 'to', new.retail_price);
    elsif new.active is distinct from old.active then
      v_action := 'product_availability_changed';
      v_details := jsonb_build_object('title', new.title, 'active', new.active);
    else
      v_action := 'product_updated';
      v_details := jsonb_build_object('title', new.title);
    end if;
  elsif tg_table_name = 'customers' then
    v_action := case when tg_op = 'INSERT' then 'customer_created' else 'customer_changed' end;
    v_details := jsonb_build_object('name', new.name, 'phone', new.phone, 'active', new.active);
  elsif tg_table_name = 'staff_profiles' then
    v_action := 'staff_changed';
    v_details := jsonb_build_object(
      'full_name', new.full_name, 'role', new.role, 'active', new.active,
      'can_override_wholesale', new.can_override_wholesale, 'can_void', new.can_void
    );
  elsif tg_table_name = 'business_settings' then
    v_action := 'settings_changed';
    v_details := jsonb_build_object('business_name', new.business_name, 'contact', new.contact);
  elsif tg_table_name = 'product_categories' then
    v_action := 'category_changed';
    v_details := jsonb_build_object('name', new.name);
  else
    v_action := tg_table_name || '_changed';
  end if;

  v_id := coalesce(new.id::text, old.id::text);

  insert into audit_events (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), v_action, v_entity, v_id, v_details);

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_products on products;
create trigger audit_products
  after insert or update on products
  for each row execute function public.audit_row_change();

drop trigger if exists audit_customers on customers;
create trigger audit_customers
  after insert or update on customers
  for each row execute function public.audit_row_change();

drop trigger if exists audit_staff on staff_profiles;
create trigger audit_staff
  after insert or update on staff_profiles
  for each row execute function public.audit_row_change();

drop trigger if exists audit_settings on business_settings;
create trigger audit_settings
  after update on business_settings
  for each row execute function public.audit_row_change();

drop trigger if exists audit_categories on product_categories;
create trigger audit_categories
  after insert or update on product_categories
  for each row execute function public.audit_row_change();

-- Client-side events (login, exports) logged explicitly.
create or replace function public.log_client_event(p_action text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not an active staff account'; end if;
  if p_action not in ('login', 'data_exported') then
    raise exception 'Unsupported client event';
  end if;

  insert into audit_events (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, 'client', auth.uid()::text, coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ─────────────────────────────────────────────────────────── grants

grant execute on function public.report_sales(date, date, text) to authenticated;
grant execute on function public.report_collections(date, date) to authenticated;
grant execute on function public.report_outstanding() to authenticated;
grant execute on function public.report_outstanding_by_customer() to authenticated;
grant execute on function public.report_products(date, date) to authenticated;
grant execute on function public.report_wholesale(date, date) to authenticated;
grant execute on function public.report_below_retail(date, date) to authenticated;
grant execute on function public.report_voids(date, date) to authenticated;
grant execute on function public.report_cash_checks(date, date) to authenticated;
grant execute on function public.log_client_event(text, jsonb) to authenticated;
