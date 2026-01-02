const PccLegalization = require("../../models/pccLegalizationModels/PccLegalizationModel.js");
const { buildAdminEmail, buildUserEmail } = require("../../utils/pccEmailService.js");

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

const validatePayload = (body) => {
  const errors = [];

  if (!isValidEmail(body.email)) errors.push("Invalid email");
  if (!String(body.phone || "").trim()) errors.push("Phone is required");
  if (!String(body.country || "").trim()) errors.push("Country is required");
  if (!String(body.companyName || "").trim()) errors.push("companyName is required");

  const n = Number(body.noOfDocuments);
  if (!n || n < 1) errors.push("noOfDocuments must be >= 1");

  const submittedAt = body.submittedAt ? new Date(body.submittedAt) : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) errors.push("submittedAt must be valid ISO date");

  const docs = Array.isArray(body.documents) ? body.documents : [];
  if (docs.length !== n) errors.push("documents count must match noOfDocuments");

  for (const d of docs) {
    if (!d?.url) errors.push("Each document must have url");
    if (!d?.originalName) errors.push("Each document must have originalName");
    if (!d?.mimeType) errors.push("Each document must have mimeType");
    if (typeof d?.size !== "number") errors.push("Each document must have size (number)");
    if (typeof d?.index !== "number") errors.push("Each document must have index (number)");
  }

  return errors;
};

// POST /api/pcc-legalization/enquiry
const createPccLegalization = async (req, res) => {
  console.log(req.body);

  try {
    const errors = validatePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // 1) Save in DB (attach userId when available)
    const doc = await PccLegalization.create({
      userId: req.user?.id || null,
      name: req.body.name || "",
      email: req.body.email,
      phone: req.body.phone,
      country: req.body.country,
      companyName: req.body.companyName,
      noOfDocuments: Number(req.body.noOfDocuments),
      documents: req.body.documents || [],
      submittedAt: new Date(req.body.submittedAt),
      tracking: req.body.tracking || {},
    });

    // 2) Send emails (user + admin)
    let userSent = false;
    let adminSent = false;

    // ✅ USER EMAIL
    try {
      const userMail = buildUserEmail(doc);
      await userMail.send();
      userSent = true;
    } catch (e) {
      console.error("User email failed:", e.message);
      userSent = false;
    }

    // ✅ ADMIN EMAIL
    try {
      const adminMail = buildAdminEmail(doc);
      await adminMail.send();
      adminSent = true;
    } catch (e) {
      console.error("Admin email failed:", e.message);
      adminSent = false;
    }

    // 3) Save email status
    if (doc.emails) {
      doc.emails.userSent = userSent;
      doc.emails.adminSent = adminSent;
      doc.emails.lastEmailAt = new Date();
      await doc.save();
    }

    return res.status(201).json({
      message: "Enquiry stored successfully",
      id: doc._id,
      emails: { userSent, adminSent },
    });
  } catch (err) {
    console.error("Create PCC enquiry error:", err);
    return res.status(500).json({
      message: "Server error",
      error: String(err?.message || err),
    });
  }
};

// GET /api/pcc-legalization/enquiry
const getAllPccLegalizations = async (req, res) => {
  try {
    const items = await PccLegalization.find().sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// GET /api/pcc-legalization/enquiry/my  -> returns enquiries for logged-in user
const getMyPccLegalizations = async (req, res) => {
  try {
    console.log("[getMyPccLegalizations] req.user:", req.user);
    const userId = req.user?.id;
    if (!userId) {
      console.log("[getMyPccLegalizations] No userId found, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await PccLegalization.find({ userId }).sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// GET /api/pcc-legalization/enquiry/:id
const getPccLegalizationById = async (req, res) => {
  try {
    const item = await PccLegalization.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// DELETE /api/pcc-legalization/enquiry/:id
const deletePccLegalizationById = async (req, res) => {
  try {
    const deleted = await PccLegalization.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: deleted._id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// POST /api/pcc-legalization/enquiry/:id/resend-email
const resendPccLegalizationEmailsById = async (req, res) => {
  try {
    const item = await PccLegalization.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    let userSent = false;
    let adminSent = false;

    try {
      const userMail = buildUserEmail(item);
      await userMail.send();
      userSent = true;
    } catch (e) {
      userSent = false;
    }

    try {
      const adminMail = buildAdminEmail(item);
      await adminMail.send();
      adminSent = true;
    } catch (e) {
      adminSent = false;
    }

    item.emails.userSent = userSent;
    item.emails.adminSent = adminSent;
    item.emails.lastEmailAt = new Date();
    await item.save();

    return res.json({ message: "Emails attempted", emails: { userSent, adminSent } });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// PATCH /api/pcc/pcc-legalization/enquiry/:id -> update status & payment
const updatePccLegalizationById = async (req, res) => {
  try {
    const { status, payment } = req.body;
    const updates = {};

    if (status) {
      const validStatuses = ['Pending', 'Approved', 'Rejected', 'Dispatched', 'Received'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      updates.status = status;
    }

    if (payment) {
      const validPayments = ['Paid', 'Pending'];
      if (!validPayments.includes(payment)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }
      updates.payment = payment;
    }

    const updated = await PccLegalization.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Updated successfully", item: updated });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

module.exports = {
  createPccLegalization,
  getAllPccLegalizations,
  getPccLegalizationById,
  deletePccLegalizationById,
  resendPccLegalizationEmailsById,
  getMyPccLegalizations,
  updatePccLegalizationById,
};
