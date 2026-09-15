import { issueSession } from "../_lib/session.js";

function getAppsScriptUrl() {
  const value = String(process.env.HR_APPS_SCRIPT_URL || "").trim();
  if (!value) throw new Error("HR Apps Script URL is not configured.");
  return value;
}

function getApiSecret() {
  const value = String(process.env.HR_API_SECRET || "").trim();
  if (!value) throw new Error("HR API secret is not configured.");
  return value;
}

async function callAppsScript(username, password) {
  const target = new URL(getAppsScriptUrl());
  target.searchParams.set("key", getApiSecret());

  const response = await fetch(target.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      action: "authLogin",
      data: { username, password }
    }),
    cache: "no-store"
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Authentication backend returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || "Invalid username or password.");
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required."
      });
    }

    const backend = await callAppsScript(username, password);
    const user = backend.user || {};

    const session = issueSession(res, {
      username: user.username || username,
      email: user.email || "",
      name: user.name || username,
      role: user.role || "hr"
    });

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: {
        username: session.username,
        name: session.name,
        email: session.email,
        role: session.role
      },
      redirect: "/"
    });
  } catch (error) {
    console.error("ORIGENNT HR login error:", error);

    return res.status(401).json({
      success: false,
      error: error.message || "Unable to sign in."
    });
  }
}
