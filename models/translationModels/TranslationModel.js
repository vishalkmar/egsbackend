const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

const Translation = sequelize.define(
  "Translation",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },

    name: { type: DataTypes.STRING(150), allowNull: false, defaultValue: "" },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      set(val) { this.setDataValue("email", String(val || "").trim().toLowerCase()); },
    },
    contact: { type: DataTypes.STRING(30), allowNull: false },

    sourceLanguage: { type: DataTypes.STRING(80), allowNull: true },
    targetLanguage: { type: DataTypes.STRING(80), allowNull: true },
    category: { type: DataTypes.STRING(120), allowNull: true },
    selectedDocType: { type: DataTypes.STRING(120), allowNull: true },
    docType: { type: DataTypes.STRING(120), allowNull: true },
    country: { type: DataTypes.STRING(120), allowNull: true },
    noOfDocuments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

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
    tableName: "translation_submissions",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

Translation.SUBMISSION_TYPE = "translation";
Translation.STATUSES = STATUSES;
Translation.PAYMENTS = PAYMENTS;

module.exports = Translation;
