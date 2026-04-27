const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_NAME || "egs_global",
  process.env.DATABASE_USER || "postgres",
  process.env.DATABASE_PASSWORD || "",
  {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: Number(process.env.DATABASE_PORT || 5432),
    dialect: "postgres",
    logging: false,
    define: {
      underscored: true,
      freezeTableName: false,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

async function ensureEnumValues(typeName, values) {
  const [rows] = await sequelize.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = :typeName
      ) AS "exists";
    `,
    { replacements: { typeName } }
  );

  if (!rows?.[0]?.exists) return;

  for (const value of values) {
    await sequelize.query(
      `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS '${value}';`
    );
  }
}

async function ensureSubmissionEnums() {
  const submissionTypes = [
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

  await ensureEnumValues("enum_status_history_submission_type", submissionTypes);
  await ensureEnumValues("enum_documents_submission_type", submissionTypes);
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`PostgreSQL connected: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`);

    const { initModels } = require("../models");
    initModels();

    const syncMode = process.env.DB_SYNC || "alter";
    if (syncMode === "force") {
      await sequelize.sync({ force: true });
      console.log("DB synced (FORCE: tables dropped & recreated)");
    } else if (syncMode === "alter") {
      await sequelize.sync({ alter: true });
      console.log("DB synced (alter)");
    } else {
      await sequelize.sync();
      console.log("DB synced (safe)");
    }

    await ensureSubmissionEnums();
    console.log("Submission enums verified");
  } catch (err) {
    console.error("Postgres connection error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
