# Hosting and go-live

The app is a static Vite build plus Supabase. It needs HTTPS and a stable URL on the counter tablet.

Status: **not deployed yet.** The owner must choose the host and provide the domain/account. Everything below is ready
to execute.

## Recommended: Vercel

1. Create a Vercel account owned by the business (not a staff member's personal account).
2. Import the project from its Git repository. If there is no repository yet, push this folder to a private GitHub repo
   first.
3. Project settings:
   - Root directory: `app`
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
4. Environment variables (Production and Preview):
   - `VITE_SUPABASE_URL` — the project URL
   - `VITE_SUPABASE_ANON_KEY` — the **anon** key only. Never add the service-role key to a browser host.
5. Deploy. `app/vercel.json` already rewrites unknown paths to `index.html` so `/reports`, `/customers/:id` and receipt
   refreshes work.
6. Add the custom domain (e.g. `pos.ghardailo.com`) and wait for HTTPS to be active.

## Alternative: Netlify

- Base directory: `app`
- Build command: `npm run build`
- Publish directory: `app/dist`
- `app/public/_redirects` is copied into the build and handles SPA routing.

## Supabase settings after the domain is live

1. Authentication → URL Configuration:
   - Site URL: `https://pos.ghardailo.com`
   - Redirect URLs: add the same URL (and `http://localhost:5173` for local development).
2. Authentication → Providers → Email:
   - **Confirm email: off** for counter staff, so a new login works immediately.
   - Keep the built-in rate limits on. Supabase limits sign-in attempts and records them under Authentication → Logs;
     failed attempts are not visible to the app but are visible there.
3. Authentication → Sessions: set a sensible session length for a shared tablet (e.g. 7–30 days) and require sign-in
   again after that. Staff must sign out on the tablet before leaving.
4. Storage: confirm the `product-images` bucket exists and is public (product photos are served from it).

## Post-deploy smoke test (10 minutes)

1. Sign in as owner on the tablet, over the real shop Wi-Fi.
2. Create/reuse a product, upload a photo, confirm it appears on the sale grid.
3. Retail cash sale for ₹1 — receipt opens; print one page on the A4 printer.
4. Credit sale for a tracked customer, then repay it from the customer page.
5. Refresh `/reports` directly — it must load, not 404.
6. Download one CSV from Reports and one from Settings.
7. Void the test sale with a reason; confirm it disappears from Today totals and appears under Voids.
8. Turn Wi-Fi off: the red offline banner appears and **Charge** is disabled. Turn Wi-Fi back on.
9. Complete the daily cash check and confirm the difference is ₹0.

Delete or reset the test rows before the pilot with `supabase/scripts/reset-pilot-data.sql` (keeps staff/settings).

## Rollback

- **App:** Vercel → Deployments → promote the previous deployment. Netlify → Deploys → publish an earlier deploy.
- **Database:** restore via Supabase dashboard (see `docs/BACKUP.md`). Never run `drop-schema.sql` on the live project.
- Keep the previous app version's `VITE_SUPABASE_*` values documented; a host rollback must still point at the same
  Supabase project.

## Training and support

- One page of counter instructions: sign in, sell, credit, reprint, daily cash check, who to call.
- Name a support contact for the pilot and put the number on the counter.
- Do not let staff install other apps or share a login. One login per person is what makes the audit log meaningful.
