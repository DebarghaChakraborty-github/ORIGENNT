const crypto = require('crypto');
const { getSession } = require('./_lib/session');

function signIdentity(email, timestamp, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${email}|${timestamp}`)
    .digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.'
    });
  }

  try {
    const session = getSession(
      req,
      process.env.HR_SESSION_SECRET
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const {
      HR_APPS_SCRIPT_URL,
      HR_API_SECRET,
      HR_IDENTITY_SIGNING_SECRET
    } = process.env;

    if (!HR_APPS_SCRIPT_URL) {
      return res.status(500).json({
        success: false,
        error: 'HR Apps Script URL is not configured.'
      });
    }

    if (!HR_API_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'HR API secret is not configured.'
      });
    }

    if (!HR_IDENTITY_SIGNING_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'HR identity signing secret is not configured.'
      });
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'key' || key === 'userEmail' || key === 'userName' || key === 'authTs' || key === 'authSig') {
        continue;
      }

      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, String(item)));
      } else if (value !== undefined) {
        params.set(key, String(value));
      }
    }

    const email = String(session.email || '').trim().toLowerCase();
    const name = String(session.name || email);
    const timestamp = String(Date.now());

    params.set('key', HR_API_SECRET);
    params.set('userEmail', email);
    params.set('userName', name);
    params.set('authTs', timestamp);
    params.set(
      'authSig',
      signIdentity(
        email,
        timestamp,
        HR_IDENTITY_SIGNING_SECRET
      )
    );

    const targetUrl =
      `${HR_APPS_SCRIPT_URL}?${params.toString()}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        error: 'HR backend returned a non-JSON response.',
        detail: text.slice(0, 500)
      });
    }

    return res
      .status(response.ok ? 200 : response.status)
      .json(data);

  } catch (error) {
    console.error('HR proxy error:', error);

    return res.status(500).json({
      success: false,
      error: 'HR backend request failed.'
    });
  }
}
