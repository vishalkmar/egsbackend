const jwt = require("jsonwebtoken");

exports.requireUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const bearerToken =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    const token = req.cookies?.access_token || bearerToken;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "user") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    // include userId if present
    req.user = { id: decoded.userId || null, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
