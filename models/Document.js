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

const Document = sequelize.define(
  "Document",
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
    index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    originalName: { type: DataTypes.STRING(500), allowNull: false },
    mimeType: { type: DataTypes.STRING(150), allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    url: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    tableName: "documents",
    timestamps: true,
    indexes: [
      { fields: ["submission_id", "submission_type"] },
      { fields: ["submission_type"] },
    ],
  }
);

Document.SUBMISSION_TYPES = SUBMISSION_TYPES;

module.exports = Document;
