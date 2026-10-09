const crypto = require('crypto');
const { json, hmac, safeEqual, db, requireEnv } = require('./_lib');


async function readRaw(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
  const missing = requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RAZORPAY_WEBHOOK_SECRET']);
  if (missing.length) return json(res, 503, { error: 'Webhook is not configured.' });
  let raw; try { raw = await readRaw(req); } catch (_) { return json(res, 400, { error: 'Could not read webhook payload.' }); }
  const signature = String(req.headers['x-razorpay-signature'] || '');
  if (!signature || !safeEqual(hmac(raw.toString('utf8'), process.env.RAZORPAY_WEBHOOK_SECRET), signature)) return json(res, 401, { error: 'Invalid webhook signature.' });
  let event; try { event = JSON.parse(raw.toString('utf8')); } catch (_) { return json(res, 400, { error: 'Invalid webhook JSON.' }); }
  const payment = event?.payload?.payment?.entity;
  const order = event?.payload?.order?.entity;
  let orderId = payment?.order_id || order?.id;
  let paymentId = payment?.id || null;
  if (!orderId || !['payment.captured', 'order.paid'].includes(event.event)) return json(res, 200, { received: true, ignored: true });
  try {
    const query = new URLSearchParams({ select: 'id,amount_paise,payment_status', razorpay_order_id: `eq.${orderId}`, limit: '1' });
    const rows = await db(`launchpad_checkout_drafts?${query.toString()}`);
    const draft = Array.isArray(rows) && rows[0];
    if (!draft) return json(res, 200, { received: true, matched: false });
    const capturedAmount = payment?.amount ?? order?.amount_paid ?? order?.amount;
    if (capturedAmount != null && Number(capturedAmount) !== Number(draft.amount_paise)) {
      console.error('Webhook amount mismatch for order', orderId);
      return json(res, 400, { error: 'Payment amount did not match the checkout record.' });
    }
    if (draft.payment_status !== 'paid') {
      await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(draft.id)}&payment_status=eq.pending`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ payment_status: 'paid', razorpay_payment_id: paymentId, payment_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      });
    }
    return json(res, 200, { received: true, verified: true });
  } catch (error) {
    console.error('Webhook reconciliation failed', error.status || 'database');
    return json(res, 500, { error: 'Temporary reconciliation error. Razorpay can retry this webhook.' });
  }
};

module.exports.config = { api: { bodyParser: false } };
