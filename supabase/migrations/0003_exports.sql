-- 0003 — Owner data exports (CSV source data for backups and accounting).
-- Every function is owner-only and reads persisted records.

create or replace function public.export_sales()
returns table (
  invoice_no bigint,
  business_date date,
  sale_type sale_type,
  status sale_status,
  customer_name text,
  customer_phone text,
  staff_name text,
  total numeric,
  paid numeric,
  due numeric,
  void_reason text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select s.invoice_no, s.business_date, s.sale_type, s.status,
           c.name, c.phone, sp.full_name,
           s.total, coalesce(sb.paid, 0)::numeric(12, 2), coalesce(sb.due, 0)::numeric(12, 2),
           s.void_reason, s.created_at
    from sales s
    left join customers c on c.id = s.customer_id
    left join staff_profiles sp on sp.id = s.created_by
    left join sale_balances sb on sb.id = s.id
    order by s.invoice_no;
end;
$$;

create or replace function public.export_sale_items()
returns table (
  invoice_no bigint,
  business_date date,
  sale_type sale_type,
  sale_status sale_status,
  product_title text,
  unit product_unit,
  quantity numeric,
  unit_price numeric,
  retail_price numeric,
  line_total numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select s.invoice_no, s.business_date, s.sale_type, s.status,
           si.product_title, si.unit, si.quantity, si.unit_price, si.retail_price, si.line_total
    from sale_items si
    join sales s on s.id = si.sale_id
    order by s.invoice_no, si.id;
end;
$$;

create or replace function public.export_payments()
returns table (
  business_date date,
  kind payment_kind,
  method payment_method,
  amount numeric,
  reference text,
  customer_name text,
  invoice_no bigint,
  received_by_name text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select p.business_date, p.kind, p.method, p.amount, p.reference,
           c.name, s.invoice_no, sp.full_name, p.created_at
    from payments p
    left join customers c on c.id = p.customer_id
    left join sales s on s.id = p.sale_id
    join staff_profiles sp on sp.id = p.received_by
    order by p.created_at;
end;
$$;

create or replace function public.export_customer_balances()
returns table (
  name text,
  phone text,
  type customer_type,
  address text,
  active boolean,
  balance numeric,
  open_invoices bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select cb.name, cb.phone, cb.type, c.address, cb.active, cb.balance, cb.open_invoices
    from customer_balances cb
    join customers c on c.id = cb.customer_id
    order by cb.name;
end;
$$;

grant execute on function public.export_sales() to authenticated;
grant execute on function public.export_sale_items() to authenticated;
grant execute on function public.export_payments() to authenticated;
grant execute on function public.export_customer_balances() to authenticated;
