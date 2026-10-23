# Staff, security and daily operations

This is the short runbook for running the counter. It covers the things the app deliberately does not automate:
creating logins, offboarding staff, reviewing the audit log and handling an incident.

## Who can do what

| Action | Owner | Cashier | Enforced by |
|---|---|---|---|
| Sell retail / wholesale | ✅ | ✅ | login + RLS |
| Sell on credit to a tracked customer | ✅ | ✅ | checkout function |
| Override a wholesale price below retail | ✅ | only if flagged | function guard + audit |
| Void a sale | ✅ | only if flagged | `void_sale` guard + audit |
| Record a repayment | ✅ | ✅ | `record_repayment` |
| See other staff's sales | ✅ | own sales today only | RLS |
| Products, staff flags, settings | ✅ | ❌ | RLS |
| Reports, exports, audit log | ✅ | ❌ | owner-only functions + RLS |

The app hides owner-only links, but the database is the real boundary. Reports, exports, audit reads and voids return
`Owner only` / `not allowed` for a cashier even if they call the API directly.

## Adding a staff member

1. Supabase → Authentication → Users → **Add user**: their own email and a temporary password.
2. Copy the user UUID and run:

   ```sql
   insert into staff_profiles (id, full_name, role)
   values ('<uuid>', 'Full Name', 'cashier');
   ```

3. In the app → **Staff**, set flags:
   - `can_override_wholesale` only for people trusted to discount below retail.
   - `can_void` only for a shift supervisor; otherwise the owner keeps it.
4. Have them sign in on their own, change the password, and make a test sale.
5. Write the training date next to their name: ____ / ____.

## Removing a staff member (offboarding)

Do this on their last shift, in order:

1. App → **Staff** → set **Active** off. They lose all access immediately (functions check `active`, RLS blocks reads).
2. Supabase → Authentication → Users → their user → **Sign out all sessions** / revoke refresh tokens.
3. If they might know the owner password or have the tablet unlocked, change the owner password too.
4. Do **not** delete the auth user or `staff_profiles` row: sales, payments, voids and audit events reference them, and
   the history must keep the staff name. Deactivation keeps the record without access.
5. Review **Audit Log** for the last 30 days for voids, below-retail overrides, exports and logins outside shift hours.

## Credential recovery

- Staff forgot password: Supabase → Authentication → Users → **Send password recovery** (or set a temporary password
  and mark it must-change in Supabase if enabled).
- Owner locked out: use the Supabase account recovery email. Store those recovery details with the business records,
  not on the counter tablet.
- Lost/stolen tablet: sign out all sessions for every user in Supabase, change the owner password, then add the new
  tablet and sign in again. The app stores only a session token in the browser.
- Never create shared logins. Every sale and void must point at a person.

## Login rate limiting and security events

- Sign-in is handled by Supabase Auth, which rate-limits repeated attempts. Check Authentication → **Rate Limits** and
  Authentication → **Logs** when something looks wrong.
- Successful sign-ins, sales, payments, repayments, voids, price overrides, product/price changes, customer changes,
  staff-flag changes, settings changes and data exports are written to the app's **Audit Log**.
- Review the audit log weekly during the pilot, then monthly. Look for: voids, `below-retail` lines, exports you did
  not make, flag changes, and logins at odd hours.

## Daily close (5 minutes)

1. Today → confirm sales, cash and online totals match the day book.
2. Count the cash drawer and complete the **cash check**; investigate any difference the same day.
3. Check outstanding credit and follow up on anything overdue by the shop's own rule (the system does not set due dates).
4. Print or save the day's sales if the shop needs a paper record.

## Weekly close (10 minutes)

1. Settings → download the four CSVs (sales, sale lines, payments, balances).
2. Store them off the tablet (owner's Drive/phone/USB).
3. Skim Reports → Voids & below-retail, and Audit Log.
4. Confirm Supabase automated backups are still running (dashboard → Database → Backups).

## Incident basics

| Situation | Do this |
|---|---|
| Internet down | Stop selling through the app. The banner shows, Charge is disabled, nothing is queued. Use the paper book; enter the sales after reconnecting only if the shop's policy allows it. |
| Sale saved but printer failed | Sales History → find the invoice → reprint. A reprint does not create a new sale or payment. |
| Wrong sale entered | Void it with a clear reason (owner or flagged cashier). Do not edit financial rows; there is no edit. |
| Customer says balance is wrong | Open the customer ledger; every debit, repayment and reversal is listed with invoice numbers. Fix with a repayment or a void, never by editing the ledger. |
| Suspect misuse | Deactivate the login first, then review Audit Log and Authentication → Logs. Preserve the CSV exports before making changes. |
| Data loss/corruption | Stop using the app. Follow `docs/BACKUP.md` and restore into a safe copy first. |
