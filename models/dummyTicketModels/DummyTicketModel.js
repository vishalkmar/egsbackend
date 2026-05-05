const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const STATUSES = ["Pending", "Processing", "Approved", "Rejected", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];
const TRIP_TYPES = ["oneWay", "roundTrip"];

const DummyTicket = sequelize.define(
  "DummyTicket",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING(150), allowNull: true, defaultValue: "" },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      set(val) { this.setDataValue("email", String(val || "").trim().toLowerCase()); },
    },
    mobile: { type: DataTypes.STRING(30), allowNull: false },
    destination: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
    departureDate: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "" },
    returnDate: { type: DataTypes.STRING(20), allowNull: true },
    tripType: { type: DataTypes.ENUM(...TRIP_TYPES), allowNull: false, defaultValue: "oneWay" },
    paxes: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    paxCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    amountPerPax: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    submittedAt: { type: DataTypes.DATE, allowNull: false },
    tracking: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: "Pending" },
    payment: { type: DataTypes.ENUM(...PAYMENTS), allowNull: false, defaultValue: "Pending" },
  },
  {
    tableName: "dummy_ticket_submissions",
    timestamps: true,
    indexes: [
      { fields: ["email"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);

DummyTicket.SUBMISSION_TYPE = "dummy_ticket";
DummyTicket.STATUSES = STATUSES;
DummyTicket.PAYMENTS = PAYMENTS;

module.exports = DummyTicket;
