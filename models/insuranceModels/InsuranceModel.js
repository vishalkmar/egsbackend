const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

const Insurance = sequelize.define(
  "Insurance",
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
    insuranceType: { type: DataTypes.STRING(80), allowNull: false },
    travelDate: { type: DataTypes.STRING(20), allowNull: false },
    returnDate: { type: DataTypes.STRING(20), allowNull: true },
    tripDuration: { type: DataTypes.STRING(20), allowNull: true },
    destination: { type: DataTypes.STRING(120), allowNull: false },
    specialRequirements: { type: DataTypes.TEXT, allowNull: true },
    enquiryDate: { type: DataTypes.STRING(20), allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: false },
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
    tableName: "insurance_submissions",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

Insurance.SUBMISSION_TYPE = "insurance";
Insurance.STATUSES = STATUSES;
Insurance.PAYMENTS = PAYMENTS;

module.exports = Insurance;
