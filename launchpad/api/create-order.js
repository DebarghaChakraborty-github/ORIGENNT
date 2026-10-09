const crypto = require('crypto');
const { CATALOGUE, PROGRAMS, json, body, sha256, db, razorpay, validEmail, normalizePhone, validText, requireEnv } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
  const missing = requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  if (missing.length) return json(res, 503, { error: 'Checkout is being configured. Please try again shortly.' });
  const input = body(req);
  if (!input) return json(res, 400, { error: 'Invalid JSON request.' });
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = normalizePhone(input.phone);
  if (!validText(name, 120) || !validEmail(email) || !phone) return json(res, 400, { error: 'Please provide a valid name, email and phone number.' });

  let amountRupees = 0;
  let serviceName = '';
  let meta = {};
  const kind = input.kind;
  if (kind === 'services') {
    if (!Array.isArray(input.serviceIds) || input.serviceIds.length < 1 || input.serviceIds.length > 20) return json(res, 400, { error: 'Select between 1 and 20 services.' });
    const unique = [...new Set(input.serviceIds.map(String))];
    if (unique.length !== input.serviceIds.length) return json(res, 400, { error: 'Duplicate services are not allowed.' });
    const selected = unique.map((id) => CATALOGUE.find((item) => item.id === id));
    if (selected.some((item) => !item)) return json(res, 400, { error: 'One or more selected services are invalid. Refresh and try again.' });
    amountRupees = selected.reduce((sum, item) => sum + item.price, 0);
    serviceName = selected.map((item) => item.name).join('; ');
    meta = { kind: 'services', serviceIds: selected.map((item) => item.id), reminderPolicy: 'checkout-v1' };
  } else if (kind === 'internship') {
    const programId = String(input.programId || '');
    const program = PROGRAMS[programId];
    if (!program) return json(res, 400, { error: 'The selected internship programme is invalid.' });
    const tokenOnly = input.tokenOnly === true;
    amountRupees = tokenOnly ? 1000 : program.price;
    serviceName = tokenOnly ? `${program.name} — ₹1,000 token` : program.name;
    meta = {
      kind: 'internship', programId, tokenOnly,
      domain: String(input.domain || '').slice(0, 120),
      college: String(input.college || '').slice(0, 160),
      reminderPolicy: 'checkout-v1'
    };
  } else {
    return json(res, 400, { error: 'Unsupported checkout type.' });
  }
  const amountPaise = amountRupees * 100;
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 10000 || amountPaise > 100000000) return json(res, 400, { error: 'Invalid checkout amount.' });
  const reminderOptIn = input.reminderOptIn === true;
  const checkoutToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256(checkoutToken);
  let order;
  try {
    order = await razorpay('orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountPaise, currency: 'INR',
        receipt: `lp_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`.slice(0, 40),
        notes: { checkout_kind: kind, service_name: serviceName.slice(0, 240) }
      })
    });
  } catch (error) {
    console.error('Razorpay order creation failed', error.status || 'network');
    return json(res, 502, { error: 'Secure payment could not be started. Please try again.' });
  }
  try {
    const inserted = await db('launchpad_checkout_drafts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        token_hash: tokenHash,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        service_name: serviceName,
        service_meta: meta,
        amount_paise: amountPaise,
        currency: 'INR',
        reminder_opt_in: reminderOptIn,
        reminder_consent_at: reminderOptIn ? new Date().toISOString() : null,
        reminder_consent_version: reminderOptIn ? 'checkout-v1-2026-10' : null,
        payment_status: 'pending',
        razorpay_order_id: order.id
      }])
    });
    const record = Array.isArray(inserted) ? inserted[0] : null;
    if (!record || !record.id) throw new Error('Database insert returned no draft id');
    return json(res, 201, {
      orderId: order.id,
      draftId: record.id,
      checkoutToken,
      amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Checkout draft storage failed', error.status || 'database');
    return json(res, 502, { error: 'A secure checkout draft could not be saved. No payment has been confirmed; please try again.' });
  }
};
