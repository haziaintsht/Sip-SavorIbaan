# Sip & Savor Spot

Full-stack Next.js + Supabase app for a coffee shop: public menu with a secret
menu unlock, email-verified customer accounts, a real-time digital loyalty
stamp card, and an admin portal for stamping cards and managing the menu.

## 1. Set up Supabase

1. Create a project at supabase.com.
2. In **SQL Editor**, run `supabase/migrations/001_init.sql`. This creates the
   `profiles`, `loyalty_cards`, `stamp_logs`, and `menu_items` tables, the
   trigger that auto-creates a profile + loyalty card the moment a user's
   email is verified, the `stamp_action` RPC admins use to add/redeem
   stamps, and all RLS policies.
3. In **Authentication → Providers → Email**, make sure **Confirm email** is
   enabled.
4. In **Authentication → URL Configuration**, add your site's
   `/auth/callback` URL (e.g. `http://localhost:3000/auth/callback` and your
   production URL) to the redirect allow list.
5. Promote your first admin: after an admin account registers and verifies,
   run `update public.profiles set role = 'admin' where id = '<their-uuid>';`
   in the SQL editor.

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your project's URL and
anon key (Project Settings → API).

## 3. Install and run

```bash
npm install
npm run dev
```

## How it fits together

- **`lib/supabase/client.ts` / `server.ts`** — browser and server Supabase
  clients (`@supabase/ssr`).
- **`middleware.ts`** — refreshes the auth session on every request and
  guards `/dashboard` (any logged-in customer) and `/admin` (role = admin).
- **`app/(auth)/register`** — calls `supabase.auth.signUp` with
  `emailRedirectTo` pointing at `/auth/callback`, then routes to
  `/verify-email`.
- **`app/auth/callback/route.ts`** — exchanges the PKCE code from the
  verification email for a session, then redirects to `/dashboard`.
- **`app/menu`** — public menu. The secret menu unlocks by tapping the star
  icon next to the page title three times, or by typing `SIPNSAVOR` anywhere
  on the page.
- **`app/dashboard`** — customer's QR code + digital stamp card, subscribed
  to Supabase Realtime so new stamps appear instantly without a refresh.
- **`app/admin`** — staff search customers by name/phone/scanned QR id, then
  add or redeem stamps via the `stamp_action` RPC (admin-gated, atomic, and
  logged to `stamp_logs`).
- **`data/menu.ts`** — the structured menu content used to render `/menu`.
  Swap this for a `menu_items` table query once you're managing the menu
  from Supabase directly.

## Next steps not yet wired up

- Admin menu CRUD UI (the `menu_items` table and RLS policies are ready;
  add a form that inserts/updates rows, gated the same way `/admin` is).
- QR **scanning** in the admin panel — `html5-qrcode` is installed; mount it
  in `app/admin/page.tsx` and pipe the decoded value into the search field.
