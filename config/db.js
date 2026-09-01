const { Sequelize } = require("sequelize");

const dialect = process.env.DB_DIALECT || "mysql";
const defaultPort = dialect === "mysql" ? 3306 : 5432;

const sequelize = new Sequelize(
  process.env.DATABASE_NAME || "iccictor_egs",
  process.env.DATABASE_USER || "iccictor_egs",
  process.env.DATABASE_PASSWORD || "",
  {
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: Number(process.env.DATABASE_PORT || defaultPort),
    dialect,
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

const connectDB = async () => {
  await sequelize.authenticate();
  console.log(`${dialect.toUpperCase()} connected: ${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`);

  const { initModels } = require("../models");
  initModels();

  const syncMode = String(process.env.DB_SYNC || "false").toLowerCase();
  if (syncMode === "force") {
    await sequelize.sync({ force: true });
    console.log("DB synced (FORCE: tables dropped & recreated)");
  } else if (syncMode === "alter") {
    await sequelize.sync({ alter: true });
    console.log("DB synced (alter)");
  } else if (syncMode === "true" || syncMode === "safe") {
    await sequelize.sync();
    console.log("DB synced (safe)");
  } else {
    console.log("DB sync skipped (DB_SYNC=false). Tables not modified.");
  }
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
