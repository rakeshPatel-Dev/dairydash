# Ghardailo POS

Point-of-sale and customer-credit system for the Ghardailo Dugdh Dairy Cooperative counter.

- PRD: [`docs/PRD.md`](docs/PRD.md)
- Confirmed build decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Backup and recovery runbook: [`docs/BACKUP.md`](docs/BACKUP.md)
- Staff, security and daily operations: [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- Hosting and go-live checklist: [`docs/HOSTING.md`](docs/HOSTING.md)
- App: [`app/`](app) — React + TypeScript + Vite, Supabase backend
- Database: [`supabase/migrations/`](supabase/migrations) — run `0001`, then `0002`, then `0003`

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1. Confirm workflow | Owner decisions from PRD §13 | ✅ Done — see `docs/DECISIONS.md` |
| 2. Build core | Auth, products, customers, checkout, payments, credit ledger, receipts, sales history | ✅ Built + live smoke-tested |
| 3. Controls | Permissions hardening, reports, audit log UI, CSV export, backups + restore test | ✅ Built + live-tested; restore verified |
| 4. Pilot | Run alongside paper ledger 1–2 weeks | ⏳ Next |
| 5. Go-live | Cutover, training, support contact | ⏳ |

## Setup (one time)

1. **Apply the database schema.** The migrations in `supabase/migrations/` have already been applied to the current
   Supabase project over its connection string. For a fresh project, run them **in order** (`0001_init.sql`,
   `0002_reports_audit.sql`, `0003_exports.sql`, `0004_pack_size.sql`) in the SQL Editor or with `psql`.

   Helper scripts (use with care):
   - `supabase/scripts/drop-schema.sql` — removes all app objects (re-baseline only, destroys data)
   - `supabase/scripts/reset-pilot-data.sql` — clears test/operational data, keeps staff and settings

2. **Create the owner login.** In Supabase → **Authentication → Users → Add user**, create the owner's
   email and password. Then copy the user's UUID and run:

   ```sql
   insert into staff_profiles (id, full_name, role)
   values ('<auth-user-uuid>', 'Owner Name', 'owner');
   ```

   For cashiers: create their auth user the same way, then insert a `staff_profiles` row with
   `role = 'cashier'`. Grant wholesale override / void flags from the **Staff** screen.

   > If email confirmation is enabled, staff sign-in will fail until the address is confirmed.
   > For a counter app, turn **Confirm email** off in Authentication → Providers → Email.

3. **Configure the app.**

   ```bash
   cd app
   cp .env.example .env
   # edit .env with your Supabase project URL and anon key
   npm install
   npm run dev
   ```

   The anon key is safe in the browser; all sensitive operations are authorized by RLS and
   `security definer` functions.

4. **Add the first category and products** from the **Products** screen, then try a retail sale.

## What Phase 2 includes

- Individual logins, Owner/Cashier roles, server-enforced permissions (RLS + function guards)
- Product catalog: title, photo (auto-compressed to ~600px WebP in Supabase Storage), category, unit, price, pin/reorder, active toggle
- Customers: quick-add, search, credit ledger, repayments allocated oldest-first
- New Sale: retail and wholesale, category tabs/search, touch tiles, decimal quantities for litre/kg, editable wholesale prices prefilled from the customer's last price, below-retail flag
- Payments: cash, online, split, partial, credit; server-side validation; idempotent checkout
- Receipts: A4 print layout, reprint without creating records
- Sales history with filters, receipt view, and void-with-reason (owner or flagged cashier)
- Today dashboard: sales, cash/online collections, credit given, outstanding, recent transactions, daily cash check (owner)
- Settings: business name, contact, receipt footer

Money is stored as **rupees** with 2 decimals (`numeric(12,2)`), never paisa and never floats.

## What Phase 3 adds

- **Reports** (owner-only): sales by day/week/month split retail vs wholesale, collections by method (with repayments
  and reversals netted), outstanding credit by customer and invoice, sales by product, wholesale-vs-retail discount,
  voids, below-retail wholesale lines, and end-of-day cash checks. Every table has a CSV export.
- **Audit log** (owner-only, append-only): logins, sales, payments, repayments, voids, price overrides, product/price,
  customer, staff and settings changes, and data exports. Filter by date/action, search, export CSV.
- **Data exports** (Settings): sales invoices, sale lines, payments, customer balances.
- **Backup runbook** with a restore that was actually tested: [`docs/BACKUP.md`](docs/BACKUP.md).
- **Permission checks**: RLS plus function guards verified as a real cashier account — cashiers cannot read other
  staff's sales, read the audit log, run reports/exports, or void sales without the flag.

## Verified so far

The schema and money flows were executed against PostgreSQL 15 in a throwaway container **and** against the live Supabase project:
checkout with decimal quantities and decimal rupee prices, wholesale price override, idempotent retry, repayment
allocation, expected-cash calculation, void + reversal, audit events, customer balance/ledger, and sales history.

Live browser smoke test (Chromium, against Supabase): sign-in, category + product with photo upload,
retail cash sale, credit sale, ₹100 repayment, ledger, sales history, void — all passed with no console errors.

Phase 3 live checks: every report tab rendered correct totals (₹120 retail today, ₹240 voided, ₹360 net collections,
₹240 credit repaid); CSV downloads opened with matching rows; the audit log recorded login, sale, repayment, void and
export events; a temporary cashier login could sell and see only their own sale, but received `Owner only` from reports
and exports and was refused by `void_sale`. The temporary cashier was removed after the test. A full `pg_dump` →
`pg_restore` round-trip into a separate PostgreSQL 15 instance matched every row count, money total and the invoice
sequence — see `docs/BACKUP.md`.

## Not yet built (Phase 4–5)

Pilot operation alongside the paper ledger, production hosting, staff training, and the go-live cutover.
