-- 0005 — Sell unit for pre-packed products.
--
-- Dahi and Ghee are sold as sealed packs (200 g / 500 g / 1 kg). The pack is the unit
-- of sale: a quantity of 1 means one pack of that pack size. They were created with
-- unit = 'kg', which made the sale tile, cart, receipt and reports render a quantity
-- of 1 as "1,000 g" instead of one pack.
--
-- Paneer deliberately stays 'kg' because it is cut and weighed at the counter, so its
-- quantities keep showing in grams.
--
-- Prices, quantities and totals are untouched — only the unit label changes.

update products
set unit = 'packet'
where unit = 'kg'
  and title in ('Dahi', 'Ghee');

-- sale_items snapshot the unit at sale time, so bring the existing rows in line with
-- the product they were sold from.
update sale_items si
set unit = 'packet'
from products p
where si.product_id = p.id
  and p.title in ('Dahi', 'Ghee')
  and p.unit = 'packet'
  and si.unit = 'kg';
