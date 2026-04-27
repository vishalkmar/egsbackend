const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(val) {
        this.setDataValue("email", String(val || "").trim().toLowerCase());
      },
    },
    name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "" },
    phone: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "" },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [{ unique: true, fields: ["email"] }],
  }
);

module.exports = User;
