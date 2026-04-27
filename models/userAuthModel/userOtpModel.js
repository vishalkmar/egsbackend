const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const UserOtp = sequelize.define(
  "UserOtp",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      set(val) {
        this.setDataValue("email", String(val || "").trim().toLowerCase());
      },
    },
    otpHash: { type: DataTypes.STRING, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    maxAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    used: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    lastSentAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "user_otps",
    timestamps: true,
    indexes: [{ fields: ["email"] }, { fields: ["expires_at"] }],
  }
);

module.exports = UserOtp;
