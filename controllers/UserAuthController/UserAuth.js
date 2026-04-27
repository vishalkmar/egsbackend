const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { Op } = require("sequelize");

const { User, UserOtp } = require("../../models");
const { sendOtpEmail } = require("../../utils/mailer");

const emailField = z
  .string()
  .trim()
  .min(6)
  .max(120)
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/,
    "Invalid email"
  );

const sendOtpSchema = z.object({ email: emailField });

const optionalNonEmptyString = (schema) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, schema.optional());

const verifyOtpSchema = z.object({
  email: emailField,
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  name: optionalNonEmptyString(z.string().min(2).max(100)),
  phone: optionalNonEmptyString(z.string().min(10).max(15)),
});

const completeProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(15),
});

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const generateOtp = () => {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
};

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const profileComplete = (user) => Boolean(user && user.name && user.phone);

// 1) SEND OTP — email only. Tells frontend if user already exists.
exports.sendUserOtp = async (req, res) => {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const email = normalizeEmail(parsed.data.email);

    const recent = await UserOtp.findOne({
      where: { email, used: false },
      order: [["createdAt", "DESC"]],
    });
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

    await UserOtp.update(
      { used: true },
      { where: { email, used: false } }
    );

    await UserOtp.create({
      email,
      otpHash,
      expiresAt,
      attempts: 0,
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
      used: false,
      lastSentAt: new Date(),
    });

    await sendOtpEmail({ to: email, otp });

    const existing = await User.findOne({ where: { email } });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      expiresInSec: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      exists: Boolean(existing),
      needsProfile: !profileComplete(existing),
    });
  } catch (err) {
    console.error("sendUserOtp error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 2) VERIFY OTP — name/phone optional for returning users, required for new users
exports.verifyUserOtp = async (req, res) => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || "Invalid input" });
    }

    const email = normalizeEmail(parsed.data.email);
    const otp = parsed.data.otp;

    const otpDoc = await UserOtp.findOne({
      where: { email, used: false },
      order: [["createdAt", "DESC"]],
    });
    if (!otpDoc) {
      return res.status(400).json({ success: false, message: "OTP not found. Please request a new OTP." });
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

    otpDoc.used = true;
    await otpDoc.save();

    let user = await User.findOne({ where: { email } });

    if (!user) {
      // New user — must provide name + phone in this call
      if (!parsed.data.name || !parsed.data.phone) {
        return res.status(200).json({
          success: true,
          needsProfile: true,
          message: "OTP verified. Please complete your profile (name + phone) to continue.",
          email,
        });
      }
      user = await User.create({
        email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        lastLoginAt: new Date(),
      });
    } else {
      // Returning user — patch profile if missing & provided, then login
      const updates = { lastLoginAt: new Date() };
      if (!user.name && parsed.data.name) updates.name = parsed.data.name;
      if (!user.phone && parsed.data.phone) updates.phone = parsed.data.phone;
      await user.update(updates);
    }

    if (!profileComplete(user)) {
      return res.status(200).json({
        success: true,
        needsProfile: true,
        message: "OTP verified. Please complete your profile to continue.",
        email,
      });
    }

    const token = signToken({ userId: user.id, email: user.email, role: "user" });
    res.cookie("access_token", token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: "user" },
    });
  } catch (err) {
    console.error("verifyUserOtp error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 3) COMPLETE PROFILE — for users who verified OTP but didn't have name/phone yet
exports.completeProfile = async (req, res) => {
  try {
    const { email } = req.body || {};
    const parsed = completeProfileSchema.safeParse(req.body);
    if (!parsed.success || !email) {
      return res.status(400).json({ success: false, message: parsed.error?.issues?.[0]?.message || "Email, name and phone required" });
    }
    const normalizedEmail = normalizeEmail(email);

    // Profile completion only allowed within 5 min of a verified OTP
    const recentVerified = await UserOtp.findOne({
      where: {
        email: normalizedEmail,
        used: true,
        updatedAt: { [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) },
      },
      order: [["updatedAt", "DESC"]],
    });
    if (!recentVerified) {
      return res.status(401).json({ success: false, message: "OTP verification expired. Please request a new OTP." });
    }

    let user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        name: parsed.data.name,
        phone: parsed.data.phone,
        lastLoginAt: new Date(),
      });
    } else {
      await user.update({
        name: parsed.data.name,
        phone: parsed.data.phone,
        lastLoginAt: new Date(),
      });
    }

    const token = signToken({ userId: user.id, email: user.email, role: "user" });
    res.cookie("access_token", token, cookieOptions());

    return res.status(200).json({
      success: true,
      message: "Profile completed and login successful",
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: "user" },
    });
  } catch (err) {
    console.error("completeProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.logoutUser = async (_req, res) => {
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
