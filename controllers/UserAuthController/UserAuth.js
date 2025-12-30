const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const UserOtp = require("../../models/userAuthModel/userOtpModel");
const User = require("../../models/userAuthModel/UserModel");
const { sendOtpEmail } = require("../../utils/mailer");

// ✅ strict validation
const sendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(6)
    .max(120)
    .regex(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/,
      "Invalid email"
    ),
});

const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(6)
    .max(120)
    .regex(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/,
      "Invalid email"
    ),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

// Helpers
const normalizeEmail = (email) => email.trim().toLowerCase();

const generateOtp = () => {
  // secure random 6 digit
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
};

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // true on prod
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// 1) SEND USER OTP
exports.sendUserOtp = async (req, res) => {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const email = normalizeEmail(parsed.data.email);

    // ✅ Basic anti-spam: allow resend only after 30s (per email)
    const recent = await UserOtp.findOne({ email, used: false }).sort({ createdAt: -1 }).lean();
    if (recent?.lastSentAt) {
      const diffMs = Date.now() - new Date(recent.lastSentAt).getTime();
      if (diffMs < 30_000) {
        const wait = Math.ceil((30_000 - diffMs) / 1000);
        return res.status(429).json({ success: false, message: `Please wait ${wait}s before resending OTP.` });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 12);

    const expiresMin = Number(process.env.OTP_EXPIRES_MIN || 10);
    const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

    // ✅ Invalidate old OTPs
    await UserOtp.updateMany({ email, used: false }, { $set: { used: true } });

    const doc = await UserOtp.create({
      email,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
      used: false,
      lastSentAt: new Date(),
    });

    // ✅ Send email
    await sendOtpEmail({ to: email, otp });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      // Do not send otp in response
      expiresInSec: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      otpId: doc._id, // optional (debug); you can remove if you want
    });
  } catch (err) {
    console.error("sendUserOtp error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 2) VERIFY OTP + LOGIN (JWT + httpOnly cookie)
exports.verifyUserOtp = async (req, res) => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const email = normalizeEmail(parsed.data.email);
    const otp = parsed.data.otp;

    const otpDoc = await UserOtp.findOne({ email, used: false }).sort({ createdAt: -1 });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new OTP." });
    }

    if (otpDoc.used) {
      return res.status(400).json({ success: false, message: "OTP already used. Please request a new OTP." });
    }

    if (otpDoc.expiresAt.getTime() < Date.now()) {
      otpDoc.used = true;
      await otpDoc.save();
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      otpDoc.used = true;
      await otpDoc.save();
      return res.status(429).json({ success: false, message: "Too many attempts. Please request a new OTP." });
    }

    const match = await bcrypt.compare(otp, otpDoc.otpHash);
    if (!match) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    // ✅ OTP correct
    otpDoc.used = true;
    await otpDoc.save();

    // ✅ Ensure persistent User exists and update last login
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { lastLoginAt: new Date() }, $setOnInsert: { email } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ✅ Token payload includes user id
    const token = signToken({
      userId: String(user._id),
      email,
      role: "user",
    });

    // ✅ Store token securely in httpOnly cookie
    res.cookie("access_token", token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, email: user.email, role: "user" },
    });
  } catch (err) {
    console.error("verifyUserOtp error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 3) LOGOUT (clear cookie)
exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("logoutUser error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
