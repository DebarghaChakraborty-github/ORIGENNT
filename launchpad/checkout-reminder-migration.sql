-- LAUNCHPAD checkout backend migration (run in Supabase SQL Editor)
-- Initial table was created already. This adds the structured metadata needed to resume checkout.
ALTER TABLE public.launchpad_checkout_drafts
  ADD COLUMN IF NOT EXISTS service_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Helpful indexes for the scheduler and payment reconciliation.
CREATE INDEX IF NOT EXISTS launchpad_checkout_order_id_idx
  ON public.launchpad_checkout_drafts (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS launchpad_checkout_created_idx
  ON public.launchpad_checkout_drafts (checkout_started_at);
