# Backup, restore and recovery

Owner responsible: **Rakesh Patel** (business owner). Technical helper: add a named person before go-live and keep
their contact next to the counter. The owner is accountable for checking backups, not the helper.

## What protects the data

| Layer | What it covers | Where |
|---|---|---|
| Supabase automated backups | Full database (schema + rows) | Supabase dashboard → Database → Backups |
| Weekly CSV export | Sales, sale lines, payments, customer balances | App → Settings → **Download data now** |
| Product photos | Images in the public `product-images` Storage bucket | Supabase Storage; keep original photo files too |

A database backup does **not** contain Supabase Auth users or Storage objects. Auth users are recreated from the staff
list; product photos are re-uploaded from the originals kept by the owner. Customer names and ledger history are in the
database backup.

Check the backup retention period for the current Supabase plan and write it here before go-live:

- Plan: ____________________
- Daily backup retention: ____________________
- Point-in-time recovery: yes / no

## Before go-live

1. Confirm automated daily backups are enabled in Supabase (dashboard → Database → Backups).
2. Run the restore test below against the current data and attach the result to the go-live checklist.
3. Download all four CSVs from Settings and open them in a spreadsheet to confirm the totals.
4. Name the recovery owner and a backup person; store the Supabase account recovery details somewhere other than the
   counter tablet.
5. Keep a printed copy of this document with the recovery contacts.

## Restore test — completed 2026-10-22

Performed by: build session (owner can repeat it).

- Source: live Supabase project `qqpmzvsxnruzxlenruka`, schema `public` (80 KB compressed dump).
- Target: separate PostgreSQL 15.19 container (`ghpos-pg`), empty database `ghpos_restore`.
- Command: `pg_dump --schema=public --no-owner --no-privileges -Fc`, then `pg_restore --no-owner --no-privileges`.
- Stubs created in the target before restoring: `auth` schema with `auth.users` and `auth.uid()`, `storage` schema with
  `buckets`/`objects`, and the `anon` / `authenticated` / `service_role` roles. This is only needed when restoring into a
  plain PostgreSQL instance instead of a Supabase project.
- Restore errors: 2, both benign — `transaction_timeout` (newer pg_dump client than the target server) and
  `schema "public" already exists`.

Result: **all tables, rows, money totals and the invoice sequence matched the live database.**

| Check | Live | Restored |
|---|---|---|
| staff_profiles / customers / products | 1 / 1 / 1 | 1 / 1 / 1 |
| sales / sale_items | 2 / 2 | 2 / 2 |
| payments / payment_allocations | 3 / 3 | 3 / 3 |
| cash_checks / audit_events / settings | 1 / 8 / 1 | 1 / 8 / 1 |
| Sales total | 360.00 | 360.00 |
| Payments total | 320.00 | 320.00 |
| Invoice sequence last value | 1002 | 1002 |
| Functions / views / policies / triggers | 27 / 3 / 18 / 5 | 27 / 3 / 18 / 5 |

The numbers above include the Phase 3 test rows (a voided credit sale, repayments and audit events). Re-run the same
comparison after the pilot reset if a clean evidence sheet is wanted.

## How to restore into Supabase (real recovery)

Preferred: use Supabase's own restore for the project (dashboard → Database → Backups → Restore). It recreates the
database, Auth users and Storage metadata together. Do not run `drop-schema.sql` on production.

If Supabase restore is unavailable, restore the dump into a **new empty Supabase project**:

```bash
# 1. Download or create a fresh dump
pg_dump "$SOURCE_CONNECTION_STRING" --schema=public --no-owner --no-privileges -Fc -f ghpos.dump

# 2. Restore into the new project (creates app tables, functions, views, policies, triggers)
pg_restore --no-owner --no-privileges --dbname "$TARGET_CONNECTION_STRING" ghpos.dump
```

Then:

1. Recreate staff Auth users in the new project and insert their `staff_profiles` rows with the same UUIDs. Without the
   same UUIDs, `sales.created_by` / audit history will not link. Supabase's own restore avoids this.
2. Re-upload product photos to the new project's `product-images` bucket and update `products.image_path` only if the
   project URL changed.
3. Point `app/.env` at the new project, sign in, and verify: Today totals, Reports → Sales, Reports → Outstanding
   credit, and a test sale.
4. Keep the old project read-only until the owner signs off on the recovered data.

## Weekly routine (5 minutes)

1. Settings → download all four CSVs; name the folder with the week's end date.
2. Compare Reports → Collections and Cash checks with the paper day book.
3. Store the folder off the counter tablet (owner's phone/Drive, or a USB drive kept by the owner).
4. Initial here: ____ / ____ / ____ / ____

## Quarterly drill

Repeat the restore test above on the latest dump and confirm the row counts and money totals match. Record the date:

- 2026-10-22 — initial restore test passed.
- Next drill due: 2027-01-22.
