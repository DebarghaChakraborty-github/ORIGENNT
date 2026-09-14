const { OAuth2Client } = require('google-auth-library');
const {
  issueSession,
  isAuthorisedEmail,
  getRole
} = require('../_lib/session');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.'
    });
  }

  try {
    const { credential } = req.body || {};

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google credential is required.'
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        error: 'Google authentication is not configured.'
      });
    }

    if (!process.env.HR_SESSION_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'HR session security is not configured.'
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Unable to verify Google identity.'
      });
    }

    const email = String(payload.email || '')
      .trim()
      .toLowerCase();

    if (!email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        error: 'A verified Google account is required.'
      });
    }

    if (!isAuthorisedEmail(email)) {
      return res.status(403).json({
        success: false,
        error: 'This account is not authorised for ORIGENNT HR.'
      });
    }

    const role = getRole(email);

    const session = issueSession(
      res,
      {
        sub: payload.sub,
        email,
        name: payload.name || email,
        role
      },
      process.env.HR_SESSION_SECRET
    );

    return res.status(200).json({
      success: true,
      authenticated: true,
      name: session.name,
      email: session.email,
      role: session.role
    });

  } catch (error) {
    console.error('Google authentication error:', error);

    return res.status(401).json({
      success: false,
      error: 'Sign-in verification failed.'
    });
  }
}

module.exports = handler;
