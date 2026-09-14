const crypto = require('crypto');

const SESSION_COOKIE = 'origennt_hr_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(payload, secret) {
  const body = base64urlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || !secret) return null;

  const parts = String(token).split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    );

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const cookies = {};

  header.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index === -1) return;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }
  });

  return cookies;
}

function getSession(req, secret) {
  const cookies = parseCookies(req);
  return verifyToken(cookies[SESSION_COOKIE], secret);
}

function buildSessionCookie(token) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`
  ].join('; ');
}

function buildClearCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0'
  ].join('; ');
}

function issueSession(res, user, secret) {
  const now = Date.now();

  const payload = {
    sub: user.sub || user.email,
    email: user.email,
    name: user.name || user.email,
    role: user.role || 'hr',
    iat: now,
    exp: now + SESSION_TTL_SECONDS * 1000
  };

  const token = signPayload(payload, secret);

  res.setHeader(
    'Set-Cookie',
    buildSessionCookie(token)
  );

  return payload;
}

function isAuthorisedEmail(email) {
  const allowed = String(
    process.env.HR_ALLOWED_EMAILS || ''
  )
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(
    String(email || '').trim().toLowerCase()
  );
}

function getRole(email) {
  const admins = String(
    process.env.HR_ADMIN_EMAILS || ''
  )
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);

  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  return admins.includes(normalizedEmail)
    ? 'admin'
    : 'hr';
}

module.exports = {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signPayload,
  verifyToken,
  parseCookies,
  getSession,
  buildSessionCookie,
  buildClearCookie,
  issueSession,
  isAuthorisedEmail,
  getRole
};
