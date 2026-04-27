const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

const AssistantAppointment = sequelize.define(
  "AssistantAppointment",
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
    arrivalDate: { type: DataTypes.STRING(20), allowNull: false },
    submissionDate: { type: DataTypes.STRING(20), allowNull: false },
    visaType: { type: DataTypes.STRING(120), allowNull: false },
    submissionCountry: { type: DataTypes.STRING(120), allowNull: false },
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
    tableName: "assistant_appointment_submissions",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

AssistantAppointment.SUBMISSION_TYPE = "assistant_appointment";
AssistantAppointment.STATUSES = STATUSES;
AssistantAppointment.PAYMENTS = PAYMENTS;

module.exports = AssistantAppointment;
