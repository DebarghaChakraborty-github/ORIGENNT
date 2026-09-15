import { getSession } from "../_lib/session.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed." });
  }

  try {
    const secret = String(process.env.HR_SESSION_SECRET || "").trim();

    if (!secret) {
      return res.status(500).json({
        success: false,
        authenticated: false,
        error: "HR session security is not configured."
      });
    }

    const session = getSession(req, secret);

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
        username: session.username || "",
        name: session.name || "",
        email: session.email || "",
        role: session.role || "hr"
      },
      redirect: "/"
    });
  } catch (error) {
    console.error("ORIGENNT HR session error:", error);

    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }
}
