const crypto = require('crypto');
const CATALOGUE = require('./catalogue.json');
const PROGRAMS = {
  basic: { name: 'Basic Internship', price: 1499 },
  adv: { name: 'Advanced Internship', price: 4999 },
  lt: { name: 'Long-Term Program', price: 9999 }
};

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
function html(res, status, content) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.statusCode = status;
  res.end(content);
}
function body(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  try { return JSON.parse(raw || '{}'); } catch (_) { return null; }
}
function sha256(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
function hmac(value, secret) { return crypto.createHmac('sha256', secret).update(String(value)).digest('hex'); }
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  return missing;
}
async function db(path, options = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) throw new Error('Supabase server configuration is incomplete');
  const response = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!response.ok) {
    const err = new Error(`Database request failed (${response.status})`);
    err.status = response.status;
    err.detail = data;
    throw err;
  }
  return data;
}
function razorpayAuth() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay server configuration is incomplete');
  return { id, secret, authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` };
}
async function razorpay(path, options = {}) {
  const auth = razorpayAuth();
  const response = await fetch(`https://api.razorpay.com/v1/${path.replace(/^\//, '')}`, {
    ...options,
    headers: {
      Authorization: auth.authorization,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!response.ok) {
    const err = new Error(`Razorpay request failed (${response.status})`);
    err.status = response.status; err.detail = data;
    throw err;
  }
  return data;
}
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function normalizePhone(value) {
  const phone = String(value || '').trim().replace(/[\s().-]/g, '');
  return /^\+?[0-9]{10,15}$/.test(phone) ? phone : null;
}
function validText(value, max = 160) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max; }
function resumeSignature(id) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('Reminder scheduler is not configured');
  return hmac(`resume:${id}`, secret);
}
function unsubscribeSignature(id) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('Reminder scheduler is not configured');
  return hmac(`unsubscribe:${id}`, secret);
}
function inr(paise) { return `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }
module.exports = {
  CATALOGUE, PROGRAMS, json, html, body, sha256, hmac, safeEqual, requireEnv,
  db, razorpay, razorpayAuth, validEmail, normalizePhone, validText,
  resumeSignature, unsubscribeSignature, inr
};
