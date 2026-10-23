-- 0004 — Product pack size (identification label, not stock accounting).
-- Examples: "500 ml", "1 L", "1 kg", "6 pcs". Shown on tiles, cart, receipts and reports.

alter table products add column if not exists pack_size text;
alter table products drop constraint if exists products_pack_size_length;
alter table products add constraint products_pack_size_length check (
  pack_size is null or length(trim(pack_size)) between 1 and 40
);

alter table sale_items add column if not exists pack_size text;

-- Sales snapshot the pack size at sale time, like title and unit.
create or replace function public.snapshot_pack_size()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.pack_size is null and new.product_id is not null then
    select p.pack_size into new.pack_size from products p where p.id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sale_items_snapshot_pack_size on sale_items;
create trigger sale_items_snapshot_pack_size
  before insert on sale_items
  for each row execute function public.snapshot_pack_size();

-- Backfill any existing lines (safe/no-op on a clean pilot database).
update sale_items si
set pack_size = p.pack_size
from products p
where si.product_id = p.id and si.pack_size is null;

-- Product report gains the pack size column.
drop function if exists public.report_products(date, date);
create function public.report_products(p_from date, p_to date)
returns table (
  product_title text,
  pack_size text,
  unit product_unit,
  quantity numeric,
  value numeric,
  sale_count bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_owner() then raise exception 'Owner only'; end if;
  return query
    select si.product_title, si.pack_size, si.unit,
           sum(si.quantity)::numeric(14, 3),
           sum(si.line_total)::numeric(14, 2),
           count(distinct si.sale_id)
    from sale_items si
    join sales s on s.id = si.sale_id
    where s.status = 'posted' and s.business_date between p_from and p_to
    group by si.product_id, si.product_title, si.pack_size, si.unit
    order by sum(si.line_total) desc;
end;
$$;

grant execute on function public.report_products(date, date) to authenticated;

-- Sale-line export gains the pack size column.
drop function if exists public.export_sale_items();
create function public.export_sale_items()
returns table (
  invoice_no bigint,
  business_date date,
  sale_type sale_type,
  sale_status sale_status,
  product_title text,
  pack_size text,
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
           si.product_title, si.pack_size, si.unit,
           si.quantity, si.unit_price, si.retail_price, si.line_total
    from sale_items si
    join sales s on s.id = si.sale_id
    order by s.invoice_no, si.id;
end;
$$;

grant execute on function public.export_sale_items() to authenticated;
