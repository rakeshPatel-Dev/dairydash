-- ⚠️ PRE-PILOT ONLY — clears ALL operational data, including any manual test entries.
-- Do NOT run after real sales have been recorded.
--
-- Use this to wipe the smoke-test data (Fresh Milk, Sita Sharma, invoices 1001–1003,
-- cash check) before the pilot starts. Catalog + settings + staff are cleared too;
-- re-add your real products afterwards.

begin;

delete from payment_allocations;
delete from payments;
delete from sale_items;
delete from sales;
delete from cash_checks;
delete from audit_events;
delete from customers;
delete from products;
delete from product_categories;

alter sequence invoice_seq restart with 1001;

commit;

-- Staff profiles and business_settings are intentionally kept.
