const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Booked", "Picked Up", "In Transit", "Out For Delivery", "Delivered", "Cancelled"];
const PAYMENT_STATUSES = ["Pending", "Paid"];

const Courier = sequelize.define(
  "Courier",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    courierNumber: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    serviceName: { type: DataTypes.STRING(150), allowNull: true, defaultValue: "" },
    personName: { type: DataTypes.STRING(150), allowNull: true, defaultValue: "" },
    personEmail: { type: DataTypes.STRING(120), allowNull: true, defaultValue: "" },
    personPhone: { type: DataTypes.STRING(30), allowNull: true, defaultValue: "" },
    officeAddress: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    paymentStatus: { type: DataTypes.ENUM(...PAYMENT_STATUSES), allowNull: false, defaultValue: "Pending" },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "Pending" },
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: "" },
    trackingNotes: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  },
  {
    tableName: "courier_records",
    timestamps: true,
    indexes: [
      { fields: ["courier_number"] },
      { fields: ["status"] },
    ],
  }
);

module.exports = Courier;
