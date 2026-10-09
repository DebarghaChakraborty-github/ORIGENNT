# LAUNCHPAD checkout backend — deployment guide

## What this package contains
- `index.html`: LAUNCHPAD site with Razorpay-only checkout, explicit opt-in for abandoned-checkout reminders, and server-side order creation/payment verification calls.
- `api/catalogue.json`: authoritative prices for the 200 catalogue services extracted from the existing catalogue.
- `api/_lib.js`: Supabase and Razorpay server helpers.
- `api/create-order.js`: computes prices server-side, creates a Razorpay order, and stores a draft in Supabase.
- `api/verify-payment.js`: verifies the Razorpay checkout signature and confirms captured status through Razorpay's API before marking paid.
- `api/razorpay-webhook.js`: verifies Razorpay webhook signatures and reconciles captured payments if a browser closes.
- `api/reminders.js`: sends opt-in reminders and expires unpaid drafts.
- `api/resume.js`: securely loads a checkout from the signed reminder link.
- `api/reminder-optout.js`: opt-out endpoint included in every reminder.
- `checkout-reminder-migration.sql`: required SQL for the `service_meta` JSON column.

## Important: do not deploy the new `index.html` until Razorpay server keys are configured
The new checkout uses server-created orders. Until the required Razorpay server environment variables exist, the website will intentionally refuse to start a payment rather than fall back to insecure client-created payments.

## Required Vercel environment variables
Set all for **Production** (and Preview if testing previews):

- `SUPABASE_URL` — the base project URL, e.g. `https://<project-ref>.supabase.co` (not `/rest/v1/`).
- `SUPABASE_SECRET_KEY` — a rotated Supabase secret key. Never put it in HTML or Git.
- `RAZORPAY_KEY_ID` — the same public key ID used by the website's Razorpay Checkout configuration.
- `RAZORPAY_KEY_SECRET` — Razorpay account's server-side Key Secret; never expose it publicly.
- `RAZORPAY_WEBHOOK_SECRET` — a separate webhook secret created in Razorpay Dashboard for the webhook URL below.
- `RESEND_API_KEY` — Resend API key for sending reminders.
- `REMINDER_FROM_EMAIL` — sender on a domain verified in Resend, e.g. `LAUNCHPAD <reminders@your-verified-domain>`.
- `CRON_SECRET` — long random secret shared only between Vercel and Supabase Vault.

Do not paste any secret in a chat, commit, SQL migration, or frontend variable. Adding Vercel variables takes effect in new deployments; redeploy after configuration.

## Supabase migration
Before deploying, open Supabase SQL Editor and run `checkout-reminder-migration.sql`.
The original table should already exist as `public.launchpad_checkout_drafts`; this adds `service_meta` plus scheduler indexes.

## Razorpay webhook
In Razorpay Dashboard, create a webhook with URL `https://launchpad.origennt.com/api/razorpay-webhook` and subscribe to `payment.captured` and `order.paid`. Generate a unique webhook secret and set the same value as `RAZORPAY_WEBHOOK_SECRET` in Vercel. Do not use the Key Secret as the webhook secret.

## Reminder sender
Create a Resend account, verify the sender domain, create an API key, then set `RESEND_API_KEY` and `REMINDER_FROM_EMAIL` in Vercel. Do not enable the schedule until a test email works.

## Supabase scheduled job every 5 minutes
A scheduler is required for the 24/48/66/71-hour windows; a once-daily cron is not precise enough. In Supabase, enable the `pg_cron`, `pg_net`, and Vault extensions if not already enabled. Add these secrets in the Supabase Vault UI:
- Name `launchpad_reminder_url`, value `https://launchpad.origennt.com/api/reminders`
- Name `launchpad_cron_secret`, value exactly matching the Vercel `CRON_SECRET`

Then run this SQL in Supabase SQL Editor:

```sql
select cron.schedule(
  'launchpad-checkout-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'launchpad_reminder_url' limit 1),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'launchpad_cron_secret' limit 1),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'supabase-cron')
  );
  $$
);
```

If the SQL reports that an extension/schema is missing, enable the relevant extension from Supabase Database → Extensions, then retry. Keep `CRON_SECRET` out of SQL text and Git.

## Safe testing sequence
1. Use Razorpay test-mode credentials in Vercel Preview environment first; do not test a real customer payment.
2. Confirm `POST /api/create-order` creates a server-priced order and a row in `launchpad_checkout_drafts`.
3. Complete one test payment and verify that the row changes to `payment_status = 'paid'` with `payment_verified_at` set.
4. Test a payment dismissal with reminder opt-in off: no reminder should be sent.
5. Test opt-in on, then invoke the reminder endpoint manually with `Authorization: Bearer <CRON_SECRET>` and a safely adjusted test row; do not wait 24 hours for a test.
6. Confirm every reminder has an unsubscribe link, payment stops future reminders, and unpaid rows are deleted after 72 hours.
7. Verify webhook delivery in Razorpay Dashboard.

## Important implementation boundaries
- The backend computes prices from the service IDs and server-side catalogue; it does not trust a total from the browser.
- A browser checkout callback is not treated as payment confirmation by itself. The backend verifies signature and captured status; the webhook provides reconciliation.
- Reminder emails are sent only for explicit consent. The four windows are 24, 48, 66 and 71 hours after checkout initiation; the unpaid draft expires at 72 hours.
- The reminder scheduler intentionally skips an overdue stage if its timing window was missed, rather than sending stale reminders out of order.
- Unpaid draft rows are deleted at expiry. Rows marked paid are not deleted by that process.
