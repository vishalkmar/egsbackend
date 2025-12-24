// src/server.js
const express = require("express");
const mongoose = require("mongoose"); // (optional here, but ok since you installed it)
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require('cookie-parser')

const connectDB = require("./config/db");

dotenv.config();

const routes = require("./routes");
const app = express();

// ✅ Middlewares (for your installed packages)
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
}));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Test API
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is running fine!",
  });
});

app.use("/api", routes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
