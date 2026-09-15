const crypto = require("crypto");
const { getSession } = require("./_lib/session");

function signIdentity(email, timestamp, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}|${timestamp}`)
    .digest("hex");
}

async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  try {
    const sessionSecret = String(process.env.HR_SESSION_SECRET || "").trim();
    const appsScriptUrl = String(process.env.HR_APPS_SCRIPT_URL || "").trim();
    const apiSecret = String(process.env.HR_API_SECRET || "").trim();
    const identitySecret = String(
      process.env.HR_IDENTITY_SIGNING_SECRET || ""
    ).trim();

    if (!sessionSecret || !appsScriptUrl || !apiSecret || !identitySecret) {
      return res.status(500).json({
        success: false,
        error: "HR backend security configuration is incomplete."
      });
    }

    const session = getSession(req, sessionSecret);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: "Authentication required."
      });
    }

    const email = String(session.email || "").trim().toLowerCase();
    const name = String(session.name || session.username || email);

    if (!email) {
      return res.status(401).json({
        success: false,
        error: "Authenticated account has no email identity."
      });
    }

    const timestamp = String(Date.now());
    const target = new URL(appsScriptUrl);

    target.searchParams.set("key", apiSecret);
    target.searchParams.set("userEmail", email);
    target.searchParams.set("userName", name);
    target.searchParams.set("authTs", timestamp);
    target.searchParams.set(
      "authSig",
      signIdentity(email, timestamp, identitySecret)
    );

    const options = {
      method: req.method,
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    };

    if (req.method === "GET") {
      for (const [key, value] of Object.entries(req.query || {})) {
        if (
          ["key", "userEmail", "userName", "authTs", "authSig"].includes(key)
        ) {
          continue;
        }

        if (Array.isArray(value)) {
          value.forEach((item) =>
            target.searchParams.append(key, String(item))
          );
        } else if (value !== undefined) {
          target.searchParams.set(key, String(value));
        }
      }
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify({
        action: req.body?.action || "",
        data: req.body?.data || {},
        userEmail: email,
        userName: name,
        authTs: timestamp,
        authSig: signIdentity(email, timestamp, identitySecret)
      });
    }

    const response = await fetch(target.toString(), options);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: false,
        error: "HR backend returned a non-JSON response."
      });
    }

    return res
      .status(response.ok ? 200 : response.status)
      .json(data);
  } catch (error) {
    console.error("ORIGENNT HR proxy error:", error);

    return res.status(500).json({
      success: false,
      error: "HR backend request failed."
    });
  }
}

module.exports = handler;
