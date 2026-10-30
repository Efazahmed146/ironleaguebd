# Supabase setup (5 steps)

1. **Install**: `npm install` (adds `@supabase/supabase-js` and `@supabase/ssr`).
2. **Env**: `.env.local` already holds your project URL and publishable key. Restart `npm run dev` after any change.
   Never put the `secret` / `service_role` key in this app.
3. **Database**: Supabase Dashboard → SQL Editor → paste all of `supabase/setup.sql` → Run.
   Creates `users`, `lifter_state`, `plans`, `subscription_requests`, the `lifts` storage bucket and all security rules.
4. **Auth settings** (Dashboard → Authentication):
   - URL Configuration → Site URL `http://localhost:3000`, and add `http://localhost:3000/auth/callback` (plus your real domain later) to Redirect URLs.
   - Providers → Email is on by default. For testing you may switch off "Confirm email".
   - Google (optional): Providers → Google → add a Google OAuth client ID/secret.
5. **Make yourself admin** (SQL Editor, replace the email), so you can approve payments at `/admin/subscriptions`:
   ```sql
   update public.users set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   To test Pro without paying:
   ```sql
   update public.users set is_subscribed = true, subscribed_until = now() + interval '90 days'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

Flow: Log in → `/welcome` (Subscribe & Compete / View as Guest) → `/subscribe` (bKash/Nagad TrxID) → admin approves → `is_subscribed = true` → Pro badge + full access.
Plan prices (500 / 1500 BDT) are placeholders: change them in `lib/plans.ts` AND the `plans` table.

## Camera on your phone (https needed)
Phones only allow the camera on `https://` pages (or `localhost` on the same device). Opening `http://192.168.x.x:3000` on a phone shows a camera error. Options:
- **Quick demo:** tap **Skip camera (demo only)** in the recorder or weigh-in. It creates a labelled placeholder clip/photo that moderators can see is a demo. Turn it off for real meets: `demoSkips: false` in `lib/meet.ts`.
- **Real camera on phone:** run `npm run dev` and in another terminal `npx cloudflared tunnel --url http://localhost:3000` (or `ngrok http 3000`). Open the `https://…` link on your phone. Add that link + `/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs.
- **Laptop webcam:** `http://localhost:3000` works as is.

## If `public.users` was empty
Re-run the whole `supabase/setup.sql`. It renames the old `profiles` table to `users`, adds `email`, installs the signup trigger and backfills everyone who already registered.

## Demo skips (remove before launch)
While `demoSkips: true` (lib/meet.ts) you get "Skip (demo only)" buttons for: the camera, the subscription payment, the entry fee, the weigh-in approval and judging. Re-run `supabase/setup.sql` once so "Skip subscription" works (it adds `activate_demo_subscription()`).
At launch: set `demoSkips: false` AND run `update public.app_settings set value = 'off' where key = 'demo_mode';`

## Password reset, Google and Facebook login
- **Forgot password** works out of the box: Authentication → URL Configuration must list `http://localhost:3000/auth/callback` (and your live domain). Make sure "Confirm email"/SMTP emails are sending (Supabase's default sender is rate-limited: for real use add your own SMTP under Authentication → Emails → SMTP Settings).
- **Google:** Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application). Authorized redirect URI: `https://eowfjtlkmqkifbeqeajb.supabase.co/auth/v1/callback`. Paste Client ID + Secret into Supabase → Authentication → Sign In / Providers → Google → Enable.
- **Facebook (also covers Instagram users):** developers.facebook.com → My Apps → Create App → add "Facebook Login". Valid OAuth Redirect URI: `https://eowfjtlkmqkifbeqeajb.supabase.co/auth/v1/callback`. Copy App ID + App Secret into Supabase → Providers → Facebook → Enable. Switch the Meta app to Live mode so people other than you can log in.
- **Instagram:** Instagram has no login for third-party apps, so there is no "Login with Instagram" button. People log in with the Facebook account linked to their Instagram.

## Online entry-fee payment (SSLCommerz): Step 3
"Pay Entry Fee" sends the lifter to SSLCommerz's checkout (bKash, Nagad, Rocket, cards, internet banking). When they pay, our server checks the payment with SSLCommerz, marks it paid in the database and unlocks Step 4. No manual TrxID, no admin approval.

**Set up (about 10 minutes, test money only):**
1. Re-run the whole `supabase/setup.sql` (adds the `entry_payments` table).
2. Make a free sandbox account at https://developer.sslcommerz.com/registration/ . They email you a **Store ID** and **Store Password**.
3. Supabase → Project Settings → API → copy the **service_role (secret)** key. It is a SECRET: only in `.env.local` / Vercel env vars, never in the browser, never on GitHub.
4. Add to `.env.local` (then restart `npm run dev`):
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-secret-key
   SSLCOMMERZ_STORE_ID=your-store-id
   SSLCOMMERZ_STORE_PASSWORD=your-store-password
   SSLCOMMERZ_LIVE=false
   ```
5. Open Compete → Entry fee → **Pay Entry Fee**. On the sandbox page use the test bKash/card details SSLCommerz shows. After paying you return to the site and Step 4 is unlocked.

**How it is kept safe:** the price (৳`entryFeeBdt` in `lib/meet.ts`) is set by the server, not the browser. A payment only becomes "paid" after the server asks SSLCommerz to confirm it and the order id, amount (BDT) and status all match. The browser can't mark anything paid (the table has no write access for users). A lifter can have only one paid entry fee per meet; a second payment is held for refund. Risky payments flagged by SSLCommerz are "held" for a manual check (`select * from entry_payments where status = 'held';`).

**Webhook (IPN):** SSLCommerz also calls `/api/payments/sslcommerz/ipn` server-to-server, so a payment is confirmed even if the lifter closes the browser before coming back. It needs a public https address, so it works once deployed (set `NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app`). On localhost the return trip still confirms the payment; to test the IPN locally run `npx cloudflared tunnel --url http://localhost:3000` and put that https address in `NEXT_PUBLIC_SITE_URL`. In the SSLCommerz merchant panel you can also set the IPN URL under Developer → IPN settings.

**Going live:** get live keys from your SSLCommerz merchant account, set `SSLCOMMERZ_LIVE=true`, add all the variables above in Vercel, and set `demoSkips: false`. Payments appear in Supabase → Table editor → `entry_payments`.

## Shared leaderboard, follows and the email link
- **Everyone sees everyone:** your best Good Lifts are uploaded to `public.results` and the leaderboard on every device reads `public.public_leaderboard`. Re-run the whole `supabase/setup.sql` once to create them. The "Verified" tick can only be given by you (SQL editor): `update public.results set verified = true where user_id = '...';` (the app can't set it).
- **Follow counts add up:** follows and likes on the demo lifters are stored in `demo_follows` / `demo_likes`, so two accounts following the same demo lifter show 2 followers.
- **Email confirmation link shows an error on a phone?** The account IS confirmed. Opening the link in a different browser/app than the one that signed up can't start a session, so the site now says "Your email is confirmed, log in below". To skip confirmation completely while testing: Supabase → Authentication → Sign In / Providers → Email → turn **off** "Confirm email".
- **Sign-up** now only asks for name, email, mobile number and password. Age, gender, bodyweight, district and home gym are filled in after the first login (a popup asks, and Compete / Subscribe stay locked until it's done).

## Deploy with https (fixes the phone camera for everyone)
1. Put the project on GitHub (the `.env.local` file is git-ignored; don't upload it).
2. vercel.com → Add New → Project → import the repo. Under Environment Variables add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`), plus `SUPABASE_SERVICE_ROLE_KEY`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_LIVE` and `NEXT_PUBLIC_SITE_URL` for online payments. Deploy.
3. Vercel gives you `https://your-app.vercel.app`: the camera works on phones there.
4. Supabase → Authentication → URL Configuration: set Site URL to that address and add `https://your-app.vercel.app/auth/callback` to Redirect URLs.
