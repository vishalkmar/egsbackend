const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const Payment = sequelize.define(
  "Payment",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    serviceType: { type: DataTypes.STRING(50), allowNull: false },
    submissionId: { type: DataTypes.UUID, allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "INR" },
    cashfreeOrderId: { type: DataTypes.STRING(100), allowNull: true },
    cashfreeSessionId: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "Pending" },
    notes: { type: DataTypes.TEXT, allowNull: true },
    customerEmail: { type: DataTypes.STRING(120), allowNull: true },
    customerPhone: { type: DataTypes.STRING(30), allowNull: true },
    customerName: { type: DataTypes.STRING(150), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
  },
  {
    tableName: "payments",
    timestamps: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["status"] },
      { fields: ["service_type"] },
      { fields: ["cashfree_order_id"] },
    ],
  }
);

Payment.STATUSES = STATUSES;
module.exports = Payment;
