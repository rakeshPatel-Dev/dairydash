# Ghardailo POS

**Product Requirements Document (PRD): Lean v1**

- **Product:** Ghardailo POS
- **Organization:** Ghardailo Dugdh Dairy Cooperative
- **Version:** 3.1 (lean scope, with simple product catalog)
- **Status:** Ready for build
- **Date:** 22 October 2026

---

## 1. Product Summary

Ghardailo POS is a simple, reliable point-of-sale and customer-credit system for the dairy counter. It replaces the manual ledger so the owner can see **exact sales, exact collections, and exactly who owes what**, and nothing more.

It is a real operational product: data lives in a production database, permissions are enforced on the server, and posted financial records are never silently changed or deleted.

**Guiding principle:** every sale, payment, repayment, and correction is traceable, and the numbers agree everywhere they appear.

**Scope rule:** if a feature does not make counter sales faster or the numbers more trustworthy, it is not in v1.

## 2. Context

- About six product groups: milk, curd, ghee, paneer, lassi, and various sweets.
- Mostly cash sales; some payments by bank transfer / QR.
- Some regular customers take goods on credit (daily or ongoing) and pay later.
- Some wholesale customers buy in bulk at **negotiated prices with no fixed rate**.
- Some products are sold by weight or volume (litre, kg, grams), so quantities must support decimals.

## 3. Goals

1. Record a sale in 2-3 taps.
2. Support retail and wholesale sales, with a per-line editable price for wholesale.
3. Record cash, online, split, partial, and credit payments.
4. Keep accurate customer credit balances with a clear running ledger.
5. Give the owner trustworthy daily, weekly, and monthly reports.
6. Make every void, price override, and repayment traceable to a person.
7. Protect data with server-side permissions and tested backups.

## 4. Non-Goals for v1

- Stock quantity tracking (counts, low-stock alerts, wastage, adjustments). A **simple product catalog with images, titles, units, and prices is in scope** (see 7.6); stock counts can be added later as a separate, properly designed feature.
- Supplier, farmer milk collection, production, or cooperative member management.
- Accounting, tax filing, payroll, general ledger.
- Fixed wholesale price tiers or customer-specific price lists.
- Separate returns/refund workflow (a void plus a new sale covers it).
- Discount approval workflows, loyalty points, barcode scanning.
- Multi-branch, online ordering, payment-provider integration, SMS/WhatsApp receipts.
- Offline selling (see section 10).

## 5. Users and Permissions

Two roles only. Permissions are enforced by the backend and database policies, not only by hiding buttons. Every staff member has an individual login; no shared accounts.

### Owner
- Everything: products, prices, customers, staff accounts, all reports, audit log, settings, exports.
- Can void any sale and approve overrides.

### Cashier
- Create sales, record payments, record customer repayments, search products and customers, reprint receipts.
- View today's transactions.
- Cannot edit posted sales, delete anything, change product prices, or open owner reports, staff, audit log, or settings.
- **Wholesale price override** is a permission flag the owner can grant to trusted cashiers individually.
- **Void** is owner-only by default (optionally grantable).

## 6. Core Workflows

### 6.1 Retail sale
1. Cashier opens **New Sale** (Retail is the default).
2. Taps product buttons; edits quantity (decimals allowed per product unit).
3. Optionally attaches a customer. Fully paid walk-in sales need no customer.
4. Chooses payment: **Cash** or **Online** (bank/QR). Can add a second payment row for split payment.
5. System validates and saves the sale and its payments in one transaction, issues a unique invoice number, and shows the receipt.

### 6.2 Wholesale sale
1. Cashier switches to **Wholesale** and selects a customer (required).
2. Each product line starts at the **customer's last wholesale price for that product** (or the retail price if none).
3. Cashier edits each line price to the agreed rate for that day. Prices must be visible on screen before confirming.
4. Lines priced below retail show a **"below retail"** flag.
5. Payment: full, partial, or credit.
6. System saves sale, payments, and price snapshots atomically.

A wholesale sale can never confirm without the cashier having seen the line prices; it must never silently fall back to retail.

### 6.3 Credit sale
- Any sale with an unpaid balance requires a customer.
- Balance due = sale total minus payments received at checkout.
- The unpaid amount increases the customer's outstanding balance.

### 6.4 Customer repayment
1. Staff opens the customer, sees the running ledger and outstanding balance.
2. Enters amount and method (cash/online).
3. By default the payment is **auto-applied to the oldest outstanding invoice first**. The allocation is shown for confirmation.
4. Repayment and allocations commit atomically; a payment receipt is issued.
5. A payment may not exceed the outstanding balance and may not create a negative balance (no customer advances in v1).

### 6.5 Void
- Only permitted users, with a **required reason**.
- The sale is marked voided, not deleted. Its invoice number is never reused.
- Linked payments are reversed by separate reversal records, never deleted. If cash was already handed back, that is recorded as a separate refund entry.
- Actor, time, reason, and affected records are logged.
- A correction is done by voiding and entering a new sale.

### 6.6 End-of-day cash check
- Owner or authorized user opens **Today**.
- System shows **expected cash** (cash payments received, minus cash refunds) for the business date.
- User enters **counted cash**; the difference is saved with the date, user, and optional note.
- This is a simple check, not a full cash-session or shift workflow.

## 7. Functional Requirements

### 7.1 Today / Dashboard
Date filter (defaults to today) showing:
- Sales value (posted, non-voided).
- Cash received and online received (payments by method for the period).
- Credit given (unpaid amount created by sales in the period).
- Repayments received.
- Total outstanding credit (current).
- Number of sales; retail vs wholesale split.
- Recent transactions.

Definitions must stay consistent everywhere:
- **Sales** = value of posted sales in the period, excluding voided.
- **Collections** = payments received in the period, including repayments on older invoices.
- **Outstanding credit** = current unpaid balance across customers.
- Never label sales value as cash collected. Each report states whether it is by sale date, payment date, or current balance.

### 7.2 New Sale screen
- Retail/Wholesale toggle.
- Large product tiles showing **image, title, unit, and price**; category tabs and quick search. Tiles are shown in the owner's chosen order, and inactive products are hidden.
- Cart with quantity and line total; wholesale lines have editable price.
- Customer selector (search by name/phone, quick-add allowed).
- Total, paid, balance due.
- Clear success or failure message; success shown only after the database confirms.

Rules:
- Empty cart cannot be submitted.
- Quantity must be positive; decimals allowed (up to 3 places for kg/litre units; whole numbers for piece/packet units).
- Prices must be non-negative.
- Totals are recalculated on the server before posting.
- Double-tap or retry must not create a duplicate sale (idempotency key per checkout).
- A failed request leaves no partial sale or payment.

### 7.3 Payments
- Methods: **Cash**, **Online (QR/bank transfer)**; optional reference/note for online.
- Full, partial, unpaid (credit), and split payments supported.
- Payments are separate records (amount, method, time, receiving staff, optional reference).
- Payment cannot exceed amount due.
- Credit requires a customer.
- Payment status is derived: **Paid**, **Partially paid**, **Unpaid (Credit)**.
- Money is stored as integer paisa; no floating-point arithmetic.

### 7.4 Sales history
- List: invoice number, date/time, customer or Walk-in, Retail/Wholesale, total, paid, balance due, payment status, sale status (Posted/Voided), staff.
- Search: invoice number, customer name/phone. Filters: date range, type, payment status, sale status.
- Actions: view details, print/reprint receipt, view linked payments, void (if permitted), export CSV (owner).
- Reprinting never creates a sale or payment.

### 7.5 Customers and credit ledger
- Fields: name, phone, type flag (Retail / Wholesale), optional address and notes, active/inactive.
- Customer page: current balance, open invoices, **running ledger** (credit sale, repayment, balance), and a Repay button.
- Balance is **always calculated** from posted sales, payment allocations, voids, and authorized adjustments. It is never an editable field.
- Customers with financial history are deactivated, not deleted.
- **Opening balances** at go-live are entered as dated, traceable opening-balance entries (with source and owner approval), not typed into a balance field.
- Any manual adjustment is a separate owner-only record with a reason and audit entry.

### 7.6 Products (simple catalog)

This is a catalog, not stock accounting. Its only job is to give the cashier a clean, recognizable set of tiles to tap.

**Product fields**
- **Title** (required), for example "Fresh Milk".
- **Image** (optional but recommended): one photo per product.
- **Category** (required), for example Milk, Curd, Ghee, Paneer, Lassi, Sweets.
- **Unit** (required): litre, kg, packet, piece, etc.
- **Pack size** (optional): a short identification label such as "500 ml", "1 L" or "1 kg". It is shown on tiles, cart lines, receipts and reports so two packs of the same product are easy to tell apart. It is **not** a stock count and never limits how many can be sold.
- **Retail price** (required).
- **Display order** (the owner can reorder tiles, and favorites can be pinned to the front).
- **Active/inactive** toggle.
- Optional short description.

**Owner screen: Products**
- Grid or list with image, title, pack size, unit, price, and active status.
- One simple **Add / Edit product** form with exactly the fields above, and nothing else.
- Quick actions: edit price, activate/deactivate, reorder.
- Categories managed in the same screen (add, rename, reorder).
- Cashiers can see products on the sale screen but cannot add or edit them.

**Image rules**
- Upload from phone camera or gallery; accepted types JPG, PNG, WebP.
- The app automatically resizes and compresses images (for example to about 600 px wide, under about 200 KB) so tiles load instantly on the counter device.
- Stored in private-or-public object storage (for example Supabase Storage); the product stores only the file path.
- A product without an image shows a neutral placeholder with its title and category color, so a missing photo never blocks selling.
- Replacing an image never affects old receipts (receipts show text only).

**Rules**
- Only the owner can add products, edit titles/images, or change prices; every price change is audit-logged.
- Updating a price never alters historical sales. Each sale item stores a snapshot of product name, pack size, unit, quantity, and the unit price actually applied.
- Products used in sales are deactivated, never hard-deleted.
- Only a retail price is stored on the product. **There is no wholesale price field.**
- Validate required fields; price must be non-negative; duplicate titles within a category are warned about.

### 7.7 Wholesale pricing controls
- Last-used wholesale price per customer and product is looked up from past sale items and prefilled.
- Overriding a price on a wholesale line requires the override permission (owner, or cashier with the flag).
- Every override is written to the audit log: who, product, retail price, price used.
- Lines below retail are flagged on screen and in reports.

### 7.8 Reports
All reports support a date range and CSV export; exported totals match on-screen totals. Reports read from persisted records, not UI state.

1. **Sales by date** (daily / weekly / monthly), with retail vs wholesale.
2. **Collections** by date and payment method (cash / online).
3. **Outstanding credit** by customer and by invoice.
4. **Sales by product** (quantity and value).
5. **Wholesale vs retail value**: total wholesale sales and total discount against retail value.
6. **Voids and below-retail sales** (who, when, reason).
7. **End-of-day cash checks** (expected, counted, difference).

### 7.9 Receipt / invoice
- Business name and contact; unique invoice number; date/time; customer name/phone where applicable; sale type.
- Items: name, quantity, unit, unit price, line total.
- Total, payment breakdown, amount paid, balance due, payment status.
- Clean print layout for A4 and/or thermal printer (**format to be confirmed**; see section 13).
- Do not claim SMS/messaging delivery.

### 7.10 Audit log
One `audit_events` table, shown as a simple **owner-only list** with filters by date and action.

Events logged: login, sale created, payment received, repayment allocated, sale voided, wholesale price override, product price changed, customer details changed, opening balance or adjustment entered, role/permission changed, data exported.

Each event records actor, timestamp, action, affected record, and reason/details. Audit records cannot be edited or deleted through the application.

### 7.11 Settings (owner only)
- Business name, contact, logo, receipt footer.
- Currency display: NPR (रु).
- Staff accounts and roles; per-cashier flags (wholesale override, void).
- Backup status and data export.

Settings are stored in the database, not in a user's browser.

## 8. Navigation

1. **New Sale**
2. **Today** (dashboard, recent sales, end-of-day cash check)
3. **Customers** (credit ledger and repayments)
4. **Products**
5. **Reports**

Plus an owner-only area for **Sales History**, **Staff**, **Audit Log**, and **Settings** (Sales History may be shown to cashiers for today's transactions only). Only permitted items are displayed, and the backend enforces permissions regardless.

## 9. Data Model

PostgreSQL. Suggested tables:

- `staff_profiles` (linked to auth user; role; override and void flags)
- `customers`
- `product_categories` (name, sort order)
- `products` (title, category, unit, pack size label, retail price in rupees, `image_path`, `sort_order`, `is_pinned`, active, description)
- `sales` (invoice number, type, customer, status, totals in rupees, idempotency key, created by/at)
- `sale_items` (product snapshot: name, pack size, unit, quantity numeric(10,3), unit price in rupees, retail price in rupees at time of sale, line total)
- `payments` (amount, method, reference, received by, time, kind: sale payment / repayment / refund / reversal)
- `payment_allocations` (payment to sale, amount)
- `opening_balances` or an opening-balance invoice type, so they allocate like any other invoice
- `balance_adjustments` (owner-only, with reason)
- `cash_checks` (business date, expected, counted, difference, user, note)
- `audit_events`
- `business_settings`

Constraints:
- Foreign keys on all references; unique invoice numbers (generated from a database sequence, never reused).
- Check constraints: quantity > 0, prices >= 0, payments > 0, allocations do not exceed invoice due or payment amount.
- No hard deletes on posted financial records; voids and reversals are new records.
- Checkout and repayment run inside database transactions.

## 10. Technical and Security Requirements

**Architecture (suggested):** React + TypeScript frontend; Supabase (PostgreSQL, Auth, Row Level Security, Storage for product images) or a small trusted API; checkout and repayment implemented as database functions/transactions. Managed hosting over HTTPS.

**Security**
- Individual staff logins; authentication required for all operations.
- Authorization checked on every sensitive operation on the server or through database policies.
- Never expose service-role or privileged keys in the browser.
- Validate all inputs server-side; recompute totals from trusted data.
- Rate-limit login attempts; log security events.
- Process for staff offboarding and credential recovery.

**Transaction safety**
- Checkout and repayment are atomic: all steps succeed or none do.
- Concurrent sales never reuse invoice numbers; retries never duplicate sales; repayments never over-allocate.

**Backups**
- Automated daily database backups with defined retention.
- **One restore tested** in a safe environment before go-live; an owner-accessible CSV export of sales, payments, and customer balances.
- A named person is responsible for recovery.
- A backup is not considered sufficient until restoration is tested.

**Offline behavior (v1: online-only)**
- The app clearly shows when it is offline and **never claims a sale is saved when it is not**.
- Checkout is disabled (not queued) while offline.
- Offline selling with local queue and sync is a possible later phase only if internet outages prove frequent. It must not be improvised.

**Performance and reliability**
- Product tap to cart should feel immediate on the actual counter device.
- Show saving progress and clear failure messages; prevent repeated taps from submitting twice.
- Test on the real device, browser, network, and printer.

## 11. UX and Visual Design

- Clean, modern interface with a **Ghardailo green** accent, warm off-white/cream surfaces, charcoal text.
- Semantic colors: green = paid, amber = partial/credit, blue = online, purple = wholesale, rose = void/destructive.
- Status is always shown as text as well as color.
- Large, touch-friendly product buttons and controls; speed and clarity over decoration on the sale screen.
- Visible focus states, labeled inputs, readable error messages.
- Desktop/tablet: product grid and cart side by side. Mobile: usable without horizontal overflow.

## 12. Edge Cases to Handle

- Empty cart; invalid quantity or price.
- Credit sale without a customer.
- Payment greater than amount due, or repayment greater than balance.
- Product deactivated or price changed while a sale is in progress.
- Double-tap or network retry during checkout.
- Database or network failure during checkout or repayment (nothing partial saved; clear message).
- Two staff members working on the same customer at once.
- Void of a sale that was fully or partly paid.
- Customer deactivation while they have open invoices (block or warn).
- Unauthorized access to a route or API.
- Printer unavailable (sale remains saved; reprint later).
- Internet outage (checkout paused with clear message).
- Backup or restore failure (alert owner).

Errors must never silently discard a transaction or report false success.

## 13. Decisions to Confirm with the Owner

1. **Hardware:** phone, tablet, or laptop at the counter? Receipt printer (thermal) or A4 only?
2. **Wholesale override:** owner-only, or also trusted cashiers? Any discount level that needs the owner's approval?
3. **Credit policy:** who may be given credit, and are credit limits or due dates needed?
4. **Units:** exact unit for each product (litre, kg, packet, piece); are fractional quantities allowed for all?
4a. **Product photos:** who will take and upload them, and is a placeholder acceptable for products without photos?
5. **Receipt:** which business details must appear (name, address, PAN/VAT number if any)?
6. **Opening balances:** how existing customer debts will be verified and entered at launch.
7. **Business day:** calendar day, or a different cutoff (for example, late-night sales)?
8. **Backups and ownership:** who owns the hosting account, who receives backup alerts, who can export records?
9. **Cash check:** is a daily expected-vs-counted check enough, or are separate shift counts needed?

## 14. Acceptance Checklist (Pilot Ready)

1. Staff sign in with individual accounts; backend blocks restricted actions for cashiers.
2. Retail and wholesale sales can be created; wholesale line prices are editable, prefilled from the customer's last price, and flagged if below retail.
3. Full, partial, split, and credit payments work; a credit sale without a customer is rejected.
4. Sale and payments commit atomically; a forced failure leaves nothing partial.
5. Repayments are separate records, allocated oldest-first, and cannot exceed the balance.
6. Customer balances reconcile exactly with sales, payments, voids, and adjustments.
7. Voids require permission and a reason, create reversals, and never delete records; invoice numbers are never reused.
8. Price changes never alter historical receipts; decimals and rupee math are correct.
8a. The owner can add a product with title, image, category, unit, pack size, and price in under a minute; images are compressed automatically; products without images still display and sell; cashiers cannot edit products.
9. Double-tap and retry do not create duplicate sales; simultaneous sales do not collide.
10. Daily, collections, outstanding credit, product, and wholesale-discount reports match underlying records and CSV exports.
11. Audit log records voids, overrides, repayments, price changes, and role changes; owner-only access.
12. Receipts print clearly and reprint without creating new records.
13. Data persists across refreshes, restarts, and deployments.
14. Automated backups are on and one restore has been tested.
15. Tested on the real counter device, network, and printer with realistic sample data.
16. Owner has signed off on credit rules, payment methods, receipt format, and roles.

## 15. Rollout Plan

1. **Confirm workflow:** settle the decisions in section 13 with the owner and counter staff.
2. **Build core:** auth, products, customers, checkout, payments, credit ledger, receipts, sales history.
3. **Controls:** permissions, voids, audit log, reports, cash check, backups with restore test, CSV export.
4. **Pilot:** one or two staff use it alongside the paper ledger for about one to two weeks; reconcile sales, collections, and balances daily until the owner is satisfied.
5. **Go-live:** pick a cutover date, enter agreed opening balances as traceable entries, train staff, name a support contact, and keep the paper records.

## 16. Definition of Done

Ghardailo POS is ready for real use only when the core financial workflows are verified, permissions are tested, transaction integrity is demonstrated, a backup restore has succeeded, staff are trained, and the owner has reconciled pilot results against the existing ledger.

**Every sale, payment, repayment, and correction must be traceable, and the numbers must agree everywhere they appear.**
