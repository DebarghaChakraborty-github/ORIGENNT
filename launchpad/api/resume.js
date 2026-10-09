const { json, db, safeEqual, resumeSignature, sha256, requireEnv } = require('./_lib');
const crypto = require('crypto');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'Method not allowed' }); }
  if (requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'CRON_SECRET']).length) return json(res, 503, { error: 'Checkout resume is not configured.' });
  const id = String(req.query?.draft || '');
  const sig = String(req.query?.sig || '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !safeEqual(resumeSignature(id), sig)) return json(res, 400, { error: 'Invalid checkout link.' });
  try {
    const query = new URLSearchParams({
      select: 'id,customer_name,customer_email,customer_phone,service_name,service_meta,amount_paise,payment_status,expires_at,reminder_opt_in,razorpay_order_id',
      id: `eq.${id}`, payment_status: 'eq.pending', limit: '1'
    });
    const rows = await db(`launchpad_checkout_drafts?${query.toString()}`);
    const row = Array.isArray(rows) && rows[0];
    if (!row || Date.parse(row.expires_at) <= Date.now()) return json(res, 410, { error: 'This checkout draft has expired or is already complete.' });
    const checkoutToken = `${row.id}.${sig}`;
    await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(row.id)}&payment_status=eq.pending`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ token_hash: sha256(checkoutToken), updated_at: new Date().toISOString() })
    });
    return json(res, 200, {
      id: row.id,
      orderId: row.razorpay_order_id,
      checkoutToken,
      keyId: process.env.RAZORPAY_KEY_ID,
      reminderOptIn: row.reminder_opt_in === true,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      serviceName: row.service_name,
      meta: row.service_meta || {},
      amountPaise: Number(row.amount_paise),
      expiresAt: row.expires_at
    });
  } catch (_) { return json(res, 500, { error: 'Could not restore this checkout. Please select the service again.' }); }
};
