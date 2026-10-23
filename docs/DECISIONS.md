# Build Decisions — Confirmed (Phase 1)

Status: locked for build. Source: docs/PRD.md §13 + owner/developer answers, 22 Oct 2026.

| # | Decision | Answer |
|---|---|---|
| 1 | Hardware | Tablet at the counter; receipts are **A4 only** (no thermal printer support in v1) |
| 2 | Wholesale price override | Owner always; trusted cashiers individually via a per-staff permission flag |
| 3 | Credit policy | Credit allowed for any tracked customer; **no credit limits or due dates** |
| 4 | Units | `litre`, `kg`, `packet`, `piece` — decimals (3 places) for litre/kg; whole numbers for packet/piece |
| 5 | Product photos | Owner uploads via phone camera/gallery; images stored in **Supabase Storage**, compressed client-side (~600px, <200KB); neutral placeholder tile when no image |
| 6 | Receipt contents | Business name + contact, invoice no., date/time, items, totals, payment breakdown, balance due, footer. No PAN/VAT in v1 |
| 7 | Opening balances | **Start clean at zero** — no opening-balance entries at launch; the paper ledger remains the historical record |
| 8 | Business day | Calendar day, Asia/Kathmandu (NPT) timezone for reports and cash checks |
| 9 | Cash check | One daily expected-vs-counted comparison; no shift-level counts |
| 10 | Stack | React + TypeScript (Vite), Supabase (PostgreSQL + Auth + RLS + Storage), checkout/repayment as Postgres functions, managed HTTPS hosting |
| 11 | Money model | **Rupees, not paisa.** All amounts are `numeric(12,2)` rupees (exact, 2 decimals). No ×100 conversions anywhere in the app or database |

## Phase 3 choices (implemented 22 Oct 2026)

| Area | Choice |
|---|---|
| Reports | Owner-only database functions; date range defaults to the current month; sales grouped by day/week/month; tables show totals and export the same rows as CSV |
| Collections | Cash and online gross receipts net of reversals; repayments shown as a subset so cash figures reconcile |
| Credit reporting | "Outstanding" is a point-in-time view: per customer and per open invoice, regardless of the date range |
| Audit log | Append-only table; successful logins, sales, payments, repayments, voids, overrides, product/price/customer/staff/settings changes, and exports are logged. Failed logins live in Supabase Auth logs |
| Exports | Owner-only RPCs for sales, sale lines, payments, balances; CSV built in the browser (no third-party service); every export is logged |
| Backups | Supabase automated daily backups; recovery owner **Rakesh Patel**; full `pg_dump` → `pg_restore` round-trip verified 22 Oct 2026 (`docs/BACKUP.md`) |
| Offline | Online-only, no queue. Browser offline state shows a red banner and disables **Charge**; the server remains the source of truth |
| Hosting | Static Vite build; Vercel recommended (Netlify supported). Not deployed yet — owner must pick the host/domain (`docs/HOSTING.md`) |

## Consequences of these decisions
- No `opening_balances` backfill flow needed at go-live (table still exists for future use, but nothing to migrate).
- Receipt print CSS targets A4 portrait only.
- Quantity `numeric(10,3)` with check `> 0`; `unit` enum constrained to the 4 values.
- Money columns are `numeric(12,2)` rupees; line totals are `round(qty * unit_price, 2)` on the server.
- Photo upload is owner-only; cashiers see tiles read-only.
- All date filtering uses `Asia/Kathmandu` regardless of server timezone.

## Catalog update (implemented 22 Oct 2026)

| Area | Choice |
|---|---|
| Pack size | Optional label (`products.pack_size`, up to 40 characters), for example "500 ml", "1 L" or "1 kg". Shown on product/sale tiles, cart lines, receipts and the product report; copied onto each sale line at sale time. It is an identification label, **not** a stock count, and never blocks a sale. |

## Phase plan (PRD §15)
2. **Build core** — auth, product catalog, customers, checkout (retail + wholesale), payments, credit ledger, receipts, sales history.
3. **Controls** — permissions/RLS hardening, voids + reversals, audit log, reports, cash check, backups + tested restore, CSV export.
4. **Pilot** — run parallel to paper ledger ~1–2 weeks, daily reconciliation.
5. **Go-live** — cutover, training, support contact.
