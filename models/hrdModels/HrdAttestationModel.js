const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

const Hrd = sequelize.define(
  "Hrd",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },

    firstName: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    lastName: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      set(val) { this.setDataValue("email", String(val || "").trim().toLowerCase()); },
    },
    mobile: { type: DataTypes.STRING(30), allowNull: false },

    state: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    district: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    docType: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
    selectedDocs: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    docCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    message: { type: DataTypes.TEXT, allowNull: false, defaultValue: "" },

    enquiryDate: { type: DataTypes.STRING(20), allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: false },

    tracking: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    emails: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { userSent: false, adminSent: false, lastEmailAt: null },
    },

    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "Pending" },
    payment: { type: DataTypes.ENUM(...PAYMENTS), allowNull: false, defaultValue: "Pending" },
  },
  {
    tableName: "hrd_submissions",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

Hrd.SUBMISSION_TYPE = "hrd";
Hrd.STATUSES = STATUSES;
Hrd.PAYMENTS = PAYMENTS;

module.exports = Hrd;
