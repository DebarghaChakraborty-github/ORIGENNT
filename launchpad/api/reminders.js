const { json, db, requireEnv, resumeSignature, unsubscribeSignature, inr } = require('./_lib');
const HOUR = 60 * 60 * 1000;
const STAGES = [
  { key: 'reminder_24h_sent_at', start: 24, end: 48, subject: '2 days left to complete your LAUNCHPAD checkout', heading: '2 days left to complete', copy: 'Your selected career service is still waiting in your checkout. Complete payment within the next two days if you would like to proceed.' },
  { key: 'reminder_48h_sent_at', start: 48, end: 66, subject: '1 day left to complete your LAUNCHPAD checkout', heading: '1 day left to complete', copy: 'Your checkout has not been confirmed yet. There is about one day left before this checkout draft expires.' },
  { key: 'reminder_66h_sent_at', start: 66, end: 71, subject: '6 hours left to complete your LAUNCHPAD checkout', heading: '6 hours left to complete', copy: 'Your unpaid checkout draft is due to expire in approximately six hours.' },
  { key: 'reminder_71h_sent_at', start: 71, end: 72, subject: '1 hour left to complete your LAUNCHPAD checkout', heading: '1 hour left to complete', copy: 'This unpaid checkout draft is due to expire in approximately one hour.' }
];
function safe(s) { return String(s || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.REMINDER_FROM_EMAIL, to: [to], subject, html })
  });
  if (!response.ok) {
    const err = new Error(`Email provider returned ${response.status}`); err.status = response.status; throw err;
  }
  return response.json();
}
module.exports = async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) { res.setHeader('Allow', 'POST, GET'); return json(res, 405, { error: 'Method not allowed' }); }
  const secret = process.env.CRON_SECRET;
  const auth = String(req.headers.authorization || '');
  if (!secret || auth !== `Bearer ${secret}`) return json(res, 401, { error: 'Unauthorized' });
  const missing = requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'RESEND_API_KEY', 'REMINDER_FROM_EMAIL']);
  if (missing.length) return json(res, 503, { error: 'Reminder email service is not configured.' });
  const now = Date.now();
  const stats = { scanned: 0, sent: 0, expired: 0, errors: 0 };
  try {
    const query = new URLSearchParams({
      select: 'id,customer_name,customer_email,service_name,service_meta,amount_paise,checkout_started_at,expires_at,reminder_opt_in,reminder_opted_out_at,payment_status,reminder_24h_sent_at,reminder_48h_sent_at,reminder_66h_sent_at,reminder_71h_sent_at',
      payment_status: 'in.(pending,failed)',
      order: 'checkout_started_at.asc',
      limit: '1000'
    });
    const rows = await db(`launchpad_checkout_drafts?${query.toString()}`);
    for (const row of (Array.isArray(rows) ? rows : [])) {
      stats.scanned++;
      const expiry = Date.parse(row.expires_at || '');
      if (!Number.isFinite(expiry)) continue;
      if (now >= expiry) {
        try {
          await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(row.id)}&payment_status=in.(pending,failed)`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
          stats.expired++;
        } catch (error) { stats.errors++; }
        continue;
      }
      if (row.payment_status === 'paid' || row.reminder_opt_in !== true || row.reminder_opted_out_at) continue;
      const start = Date.parse(row.checkout_started_at || '');
      if (!Number.isFinite(start)) continue;
      const ageHours = (now - start) / HOUR;
      const stage = [...STAGES].reverse().find((s) => ageHours >= s.start && ageHours < s.end && !row[s.key]);
      if (!stage) continue;
      // If a scheduled invocation was delayed, send only the current window's reminder
      // and mark older windows as skipped so messages are never delivered out of order.
      const older = STAGES.filter((s) => s.start < stage.start && !row[s.key]).map((s) => s.key);
      const sigResume = resumeSignature(row.id);
      const sigUnsub = unsubscribeSignature(row.id);
      const site = 'https://launchpad.origennt.com/';
      const resumeUrl = `${site}?resume=${encodeURIComponent(row.id)}&sig=${encodeURIComponent(sigResume)}#services`;
      const unsubscribeUrl = `${site}api/reminder-optout?id=${encodeURIComponent(row.id)}&sig=${encodeURIComponent(sigUnsub)}`;
      const html = `<div style="font-family:Arial,sans-serif;color:#111827;max-width:600px;margin:auto;padding:24px"><div style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#0B7A53">LAUNCHPAD · CAREER, EN-GENIUSED.</div><h1 style="font-size:28px;margin:24px 0 12px">${stage.heading}</h1><p>Hello ${safe(row.customer_name)},</p><p>${stage.copy}</p><div style="border:1px solid #d7e3d9;border-radius:12px;padding:16px;margin:20px 0"><strong>${safe(row.service_name)}</strong><p style="margin:8px 0 0">Checkout amount: ${inr(Number(row.amount_paise))}</p><p style="margin:8px 0 0;color:#52665a">Order is not confirmed until payment is verified.</p></div><p><a href="${resumeUrl}" style="display:inline-block;background:#0B7A53;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">Return to checkout</a></p><p style="font-size:12px;color:#52665a">This reminder was sent because you opted in to checkout reminders. Unpaid checkout drafts are deleted after 72 hours. LAUNCHPAD is a unit of ORIGENNT PRIVATE LIMITED.</p><p style="font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe from checkout reminders</a></p></div>`;
      try {
        await sendEmail(row.customer_email, stage.subject, html);
        const patch = { [stage.key]: new Date().toISOString(), updated_at: new Date().toISOString() };
        for (const key of older) patch[key] = new Date().toISOString();
        await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(row.id)}&payment_status=in.(pending,failed)&reminder_opted_out_at=is.null`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
        stats.sent++;
      } catch (error) {
        stats.errors++;
        console.error('Reminder email failed for draft', row.id, error.status || 'delivery');
      }
    }
    return json(res, 200, { ok: true, ...stats });
  } catch (error) {
    console.error('Reminder job failed', error.status || 'database');
    return json(res, 500, { error: 'Reminder processing failed.' });
  }
};
