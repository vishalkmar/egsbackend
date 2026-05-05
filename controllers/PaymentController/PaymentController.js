const https = require("https");
const { Op } = require("sequelize");
const { Payment, User, SUBMISSION_MODELS } = require("../../models");

const CASHFREE_API_VERSION = "2023-08-01";

function cashfreeConfig() {
  const mode = process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || "sandbox";
  const apiUrl = String(process.env.CASHFREE_API_URL || "").trim();
  return {
    appId: process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || "",
    secretKey: process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_APP_SECRET || process.env.CASHFREE_CLIENT_SECRET || "",
    isProduction: mode === "production",
    mode: mode === "production" ? "production" : "sandbox",
    apiUrl: apiUrl && !/^https?:\/\//i.test(apiUrl) ? `https://${apiUrl}` : apiUrl,
  };
}

function cashfreeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const config = cashfreeConfig();
    const defaultOrigin = config.isProduction ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
    const url = new URL(path, config.apiUrl || defaultOrigin);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": config.appId,
        "x-client-secret": config.secretKey,
      },
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request(options, (resp) => {
      let raw = "";
      resp.on("data", (chunk) => { raw += chunk; });
      resp.on("end", () => {
        try { resolve({ status: resp.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: resp.statusCode, data: raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const initiatePayment = async (req, res) => {
  try {
    const { serviceType, submissionId, amount, notes } = req.body || {};
    const amountNum = Number(amount);
    if (!serviceType || !Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: "serviceType and amount are required" });
    }

    const orderId = `EGS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const user = req.user?.id ? await User.findByPk(req.user.id) : null;
    const customerName = user?.name || "Customer";
    const customerEmail = user?.email || req.user?.email || "";
    const digitsOnlyPhone = String(user?.phone || "").replace(/\D/g, "");
    const customerPhone = digitsOnlyPhone.length >= 10 ? digitsOnlyPhone.slice(-10) : "9999999999";

    const payment = await Payment.create({
      userId: req.user?.id || null,
      serviceType,
      submissionId: submissionId || null,
      amount: amountNum,
      currency: "INR",
      cashfreeOrderId: orderId,
      notes: notes || "",
      customerEmail,
      customerPhone,
      customerName,
      status: "Pending",
      metadata: { orderId },
    });

    const { appId, secretKey, mode: cashfreeMode } = cashfreeConfig();

    if (!appId || !secretKey) {
      // Dev mode: return a mock session so the frontend can proceed
      return res.json({
        success: true,
        payment_session_id: `mock_session_${payment.id}`,
        cashfree_mode: cashfreeMode,
        paymentId: payment.id,
        orderId,
      });
    }

    const frontendOrigin = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
    const returnUrl = `${frontendOrigin}/user/payment/success?order_id=${orderId}&payment_id=${payment.id}`;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";

    const cfRes = await cashfreeRequest("/pg/orders", "POST", {
      order_id: orderId,
      order_amount: amountNum,
      order_currency: "INR",
      order_note: notes || serviceType,
      customer_details: {
        customer_id: req.user?.id || payment.id,
        customer_email: customerEmail || "user@example.com",
        customer_phone: customerPhone,
        customer_name: customerName,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: `${backendUrl}/api/payments/webhook`,
      },
    });

    if (cfRes.status !== 200 || !cfRes.data?.payment_session_id) {
      console.error("Cashfree order creation failed:", cfRes.data);
      return res.status(502).json({ success: false, message: cfRes.data?.message || "Payment gateway error" });
    }

    await payment.update({
      cashfreeOrderId: orderId,
      cashfreeSessionId: cfRes.data.payment_session_id,
      metadata: { ...payment.metadata, cfOrderId: cfRes.data.cf_order_id },
    });

    return res.json({
      success: true,
      payment_session_id: cfRes.data.payment_session_id,
      cashfree_mode: cashfreeMode,
      paymentId: payment.id,
      orderId,
    });
  } catch (err) {
    console.error("Initiate payment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body || {};
    const orConditions = [];
    if (paymentId) orConditions.push({ id: paymentId });
    if (orderId) orConditions.push({ cashfreeOrderId: orderId });
    if (!orConditions.length) return res.status(400).json({ success: false, message: "orderId or paymentId required" });

    const payment = await Payment.findOne({ where: { [Op.or]: orConditions } });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const { appId, secretKey } = cashfreeConfig();
    if (!appId || !secretKey) {
      await payment.update({ status: "Paid" });
      await markSubmissionPaid(payment);
      return res.json({ success: true, status: "Paid", payment });
    }

    const cfOrderId = payment.cashfreeOrderId || payment.metadata?.orderId;
    if (!cfOrderId) return res.status(400).json({ success: false, message: "No Cashfree order ID on record" });

    const cfRes = await cashfreeRequest(`/pg/orders/${cfOrderId}`, "GET", null);
    const orderStatus = cfRes.data?.order_status;
    const statusMap = { PAID: "Paid", EXPIRED: "Failed", ACTIVE: "Pending" };
    const newStatus = statusMap[orderStatus] || "Pending";
    await payment.update({ status: newStatus });
    if (newStatus === "Paid") await markSubmissionPaid(payment);

    return res.json({ success: true, status: newStatus, payment });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const cashfreeWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const orderId =
      payload?.data?.order?.order_id ||
      payload?.order?.order_id ||
      payload?.order_id;
    const paymentStatus =
      payload?.data?.payment?.payment_status ||
      payload?.payment?.payment_status ||
      payload?.payment_status;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "order_id missing" });
    }

    const payment = await Payment.findOne({ where: { cashfreeOrderId: orderId } });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    const statusMap = { SUCCESS: "Paid", PAID: "Paid", FAILED: "Failed", CANCELLED: "Failed" };
    const newStatus = statusMap[String(paymentStatus || "").toUpperCase()] || payment.status;
    await payment.update({ status: newStatus, metadata: { ...payment.metadata, webhook: payload } });
    if (newStatus === "Paid") await markSubmissionPaid(payment);

    return res.json({ success: true });
  } catch (err) {
    console.error("Cashfree webhook error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

async function markSubmissionPaid(payment) {
  if (!payment?.submissionId || !payment?.serviceType) return;
  const Model = SUBMISSION_MODELS[payment.serviceType];
  if (!Model) return;
  const item = await Model.findByPk(payment.submissionId);
  if (!item || typeof item.update !== "function") return;
  await item.update({ payment: "Paid" });
}

const getPaymentHistory = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
    const payments = await Payment.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    return res.json({ success: true, items: payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ where: { id: req.params.id, userId: req.user?.id } });
    if (!payment) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const adminListPayments = async (req, res) => {
  try {
    const q = req.query || {};
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const offset = (page - 1) * limit;
    const where = {};
    if (q.status) where.status = q.status;
    if (q.serviceType) where.serviceType = q.serviceType;
    const { rows, count } = await Payment.findAndCountAll({ where, order: [["createdAt", "DESC"]], limit, offset });
    return res.json({ success: true, items: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const adminGetPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const adminResendPayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Resend triggered", item: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const adminPaymentStats = async (req, res) => {
  try {
    const [total, paid, pending, failed] = await Promise.all([
      Payment.count(),
      Payment.count({ where: { status: "Paid" } }),
      Payment.count({ where: { status: "Pending" } }),
      Payment.count({ where: { status: "Failed" } }),
    ]);
    return res.json({ success: true, stats: { total, paid, pending, failed } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  initiatePayment,
  verifyPayment,
  cashfreeWebhook,
  getPaymentHistory,
  getMyPayment,
  adminListPayments,
  adminGetPayment,
  adminResendPayment,
  adminPaymentStats,
};
