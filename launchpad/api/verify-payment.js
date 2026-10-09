const { json, body, sha256, hmac, safeEqual, db, razorpay, requireEnv } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
  const missing = requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  if (missing.length) return json(res, 503, { error: 'Payment verification is not configured.' });
  const input = body(req);
  if (!input || !input.checkoutToken || !input.razorpay_order_id || !input.razorpay_payment_id || !input.razorpay_signature) return json(res, 400, { error: 'Payment verification data is incomplete.' });
  const orderId = String(input.razorpay_order_id);
  const paymentId = String(input.razorpay_payment_id);
  const expected = hmac(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
  if (!safeEqual(expected, String(input.razorpay_signature))) return json(res, 400, { verified: false, error: 'Payment signature could not be verified.' });
  let rows;
  try {
    const query = new URLSearchParams({
      select: 'id,token_hash,razorpay_order_id,payment_status,amount_paise,currency',
      token_hash: `eq.${sha256(input.checkoutToken)}`,
      razorpay_order_id: `eq.${orderId}`,
      limit: '1'
    });
    rows = await db(`launchpad_checkout_drafts?${query.toString()}`);
  } catch (error) {
    console.error('Payment draft lookup failed', error.status || 'database');
    return json(res, 502, { verified: false, error: 'Could not confirm payment yet. Do not retry payment; check again shortly.' });
  }
  const draft = Array.isArray(rows) && rows[0];
  if (!draft) return json(res, 404, { verified: false, error: 'Checkout reference was not found.' });
  if (draft.payment_status === 'paid') return json(res, 200, { verified: true, alreadyVerified: true });
  try {
    const [order, payment] = await Promise.all([
      razorpay(`orders/${encodeURIComponent(orderId)}`),
      razorpay(`payments/${encodeURIComponent(paymentId)}`)
    ]);
    if (order.id !== orderId || Number(order.amount) !== Number(draft.amount_paise) || order.currency !== 'INR' || payment.order_id !== orderId || Number(payment.amount) !== Number(draft.amount_paise) || payment.currency !== 'INR') {
      return json(res, 400, { verified: false, error: 'The payment details do not match this checkout.' });
    }
    if (payment.status !== 'captured') {
      return json(res, 202, { verified: false, pending: true, message: 'Payment was submitted and is awaiting capture confirmation. Do not pay again yet.' });
    }
    const update = await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(draft.id)}&payment_status=eq.pending`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ payment_status: 'paid', razorpay_payment_id: paymentId, payment_verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    });
    if (!Array.isArray(update) || update.length === 0) {
      const reread = await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(draft.id)}&select=payment_status&limit=1`);
      if (reread?.[0]?.payment_status !== 'paid') return json(res, 502, { verified: false, error: 'Payment is captured but the order status is being reconciled. Do not pay again.' });
    }
    return json(res, 200, { verified: true, paymentId });
  } catch (error) {
    console.error('Razorpay payment verification lookup failed', error.status || 'network');
    return json(res, 502, { verified: false, error: 'Payment was submitted but could not yet be confirmed. Do not pay again; our system will reconcile its status.' });
  }
};
