const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_ORIGIN?.trim(),
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/test", (_req, res) => {
  res.status(200).json({ success: true, message: "Backend is running fine!" });
});

app.use("/api", routes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
  });
});
