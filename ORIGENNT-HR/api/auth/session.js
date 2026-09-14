const { getSession } = require('../_lib/session');

function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.'
    });
  }

  try {
    if (!process.env.HR_SESSION_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'HR session security is not configured.'
      });
    }

    const session = getSession(
      req,
      process.env.HR_SESSION_SECRET
    );

    if (!session) {
      return res.status(401).json({
        success: false,
        authenticated: false
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        sub: session.sub,
        email: session.email,
        name: session.name,
        role: session.role
      }
    });

  } catch (error) {
    console.error('Session check error:', error);

    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }
}

module.exports = handler;
