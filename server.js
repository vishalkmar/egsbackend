const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./config/db");
const routes = require("./routes");

const app = express();

// Trust the cPanel/Passenger/Apache proxy in front of Node
app.set("trust proxy", 1);

/* =========================
   ALLOWED ORIGINS
========================= */

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://services.evrenglobalsolutions.com",
    "https://services.evrenglobalsolutions.com",

    "http://evrenglobalsolutions.com",
    "https://evrenglobalsolutions.com",

    process.env.FRONTEND_ORIGIN,
  ]
    .filter(Boolean)
    .map((o) => o.trim().toLowerCase().replace(/\/$/, ""))
);

/* =========================
   CORS MIDDLEWARE (manual, cPanel-safe)
   - Runs BEFORE helmet/body-parser/everything
   - Always responds to OPTIONS with 204
   - Never throws; if origin not allowed, just omits the header
========================= */

app.use((req, res, next) => {
  const rawOrigin = req.headers.origin;
  const normalized = rawOrigin
    ? rawOrigin.trim().toLowerCase().replace(/\/$/, "")
    : null;

  if (normalized && allowedOrigins.has(normalized)) {
    res.setHeader("Access-Control-Allow-Origin", rawOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  } else if (rawOrigin) {
    console.log("Blocked Origin:", rawOrigin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ||
      "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});

/* =========================
   MIDDLEWARE
========================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(cookieParser());

app.use(bodyParser.json({ limit: "10mb" }));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

/* =========================
   TEST ROUTE
========================= */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend running successfully",
  });
});

/* =========================
   API ROUTES
========================= */

app.use("/api", routes);

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on PORT ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("DB Connection Error:", err);
  });