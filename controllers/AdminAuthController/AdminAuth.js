const jwt = require("jsonwebtoken");
const { z } = require("zod");

// same strict email regex
const emailSchema = z
  .string()
  .trim()
  .min(6)
  .max(120)
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/,
    "Invalid email"
  );

const passwordSchema = z
  .string()
  .min(8, "Password too short")
  .max(64, "Password too long");

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  accessLevel: z.literal("Super Admin"),
});

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

exports.adminLogin = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const { email, password } = parsed.data;

    const envEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envPass = process.env.ADMIN_PASSWORD || "";

    // ✅ realtime check only (no DB)
    if (email.trim().toLowerCase() !== envEmail || password !== envPass) {
      // don't reveal which one is wrong
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken({
      email: envEmail,
      role: "super_admin",
    });

    res.cookie("admin_access_token", token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token, // optional; remove if you want cookie-only
      admin: { email: envEmail, role: "super_admin" },
    });
  } catch (err) {
    console.error("adminLogin error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.adminLogout = async (req, res) => {
  try {
    res.clearCookie("admin_access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error("adminLogout error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
