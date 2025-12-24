const jwt = require("jsonwebtoken");

exports.requireAdmin = (req, res, next) => {
  try {
    const token = req.cookies?.admin_access_token;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded?.role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // admin info attach
    req.admin = { email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};
