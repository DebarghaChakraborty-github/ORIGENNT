const { buildClearCookie } = require('../_lib/session');

function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed.'
    });
  }

  res.setHeader(
    'Set-Cookie',
    buildClearCookie()
  );

  return res.status(200).json({
    success: true,
    message: 'Signed out.'
  });
}

module.exports = handler;
