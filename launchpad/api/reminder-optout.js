const { json, html, db, safeEqual, unsubscribeSignature, requireEnv } = require('./_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'Method not allowed' }); }
  if (requireEnv(['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'CRON_SECRET']).length) return html(res, 503, '<h1>Unsubscribe is temporarily unavailable</h1><p>Please email admin@origennt.com to opt out.</p>');
  const id = String(req.query?.id || '');
  const sig = String(req.query?.sig || '');
  if (!/^[0-9a-f-]{36}$/i.test(id) || !safeEqual(unsubscribeSignature(id), sig)) return html(res, 400, '<h1>Invalid unsubscribe link</h1><p>Please use the latest reminder email.</p>');
  try {
    await db(`launchpad_checkout_drafts?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ reminder_opt_in: false, reminder_opted_out_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    });
    return html(res, 200, '<main style="font:16px Arial,sans-serif;max-width:600px;margin:12vh auto;padding:24px;color:#111"><h1>You are unsubscribed</h1><p>LAUNCHPAD checkout reminder emails have been turned off for this checkout.</p><p>You can still visit <a href="https://launchpad.origennt.com/">LAUNCHPAD</a> whenever you are ready.</p></main>');
  } catch (_) { return html(res, 500, '<h1>Could not process this request</h1><p>Please email admin@origennt.com and ask to stop checkout reminders.</p>'); }
};
