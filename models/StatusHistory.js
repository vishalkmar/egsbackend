const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SUBMISSION_TYPES = [
  "evisa",
  "hrd",
  "mea",
  "pcc",
  "sticker_visa",
  "translation",
  "assistant_appointment",
  "insurance",
  "meet_greet",
];
const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];

const StatusHistory = sequelize.define(
  "StatusHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submissionId: { type: DataTypes.UUID, allowNull: false },
    submissionType: {
      type: DataTypes.ENUM(...SUBMISSION_TYPES),
      allowNull: false,
    },
    fromStatus: { type: DataTypes.STRING(40), allowNull: true },
    toStatus: { type: DataTypes.STRING(40), allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    changedByRole: {
      type: DataTypes.ENUM("user", "admin", "system"),
      allowNull: false,
      defaultValue: "system",
    },
    changedByEmail: { type: DataTypes.STRING(120), allowNull: true },
  },
  {
    tableName: "status_history",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["submission_id", "submission_type"] },
      { fields: ["created_at"] },
    ],
  }
);

StatusHistory.STATUSES = STATUSES;
StatusHistory.SUBMISSION_TYPES = SUBMISSION_TYPES;

module.exports = StatusHistory;
