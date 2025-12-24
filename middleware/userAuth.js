const jwt = require("jsonwebtoken");

exports.requireUser = (req, res, next) => {
  try {
    const token = req.cookies?.access_token; // user cookie
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "user") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    req.user = { email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
