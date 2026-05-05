const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

const PccLegalization = sequelize.define(
  "PccLegalization",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },

    name: { type: DataTypes.STRING(150), allowNull: false, defaultValue: "" },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      set(val) { this.setDataValue("email", String(val || "").trim().toLowerCase()); },
    },
    phone: { type: DataTypes.STRING(30), allowNull: false },
    country: { type: DataTypes.STRING(120), allowNull: false },
    companyName: { type: DataTypes.STRING(200), allowNull: false },
    noOfDocuments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    submittedAt: { type: DataTypes.DATE, allowNull: false },
    enquiryDate: { type: DataTypes.STRING(20), allowNull: true },

    tracking: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    emails: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: { userSent: false, adminSent: false, lastEmailAt: null },
    },

    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "Pending" },
    payment: { type: DataTypes.ENUM(...PAYMENTS), allowNull: false, defaultValue: "Pending" },
  },
  {
    tableName: "pcc_submissions",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

PccLegalization.SUBMISSION_TYPE = "pcc";
PccLegalization.STATUSES = STATUSES;
PccLegalization.PAYMENTS = PAYMENTS;

module.exports = PccLegalization;
