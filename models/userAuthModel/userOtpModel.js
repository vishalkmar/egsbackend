const mongoose = require("mongoose");

const userOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },

    expiresAt: { type: Date, required: true, index: true },

    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },

    used: { type: Boolean, default: false },

    // rate-limit type info (optional)
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-delete expired docs (Mongo TTL)
userOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("UserOtp", userOtpSchema);
