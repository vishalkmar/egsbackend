const MeaEnquiry = require("../../models/meaEnquiryModels/MeaEnqueryModel.js");

const { buildAdminEmail,buildUserEmail} = require("../../utils/meaEmailService.js");

const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

const validatePayload = (body) => {
  const errors = [];

  if (!isValidEmail(body.email)) errors.push("Invalid email");
  if (!String(body.contact || "").trim()) errors.push("Contact is required");
  if (!String(body.country || "").trim()) errors.push("Country is required");
  if (!String(body.docCategory || "").trim()) errors.push("docCategory is required");
  if (!String(body.docType || "").trim()) errors.push("docType is required");

  const n = Number(body.noOfDocuments);
  if (!n || n < 1) errors.push("noOfDocuments must be >= 1");

  if (!body.enquiryDate) errors.push("enquiryDate is required");

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

// POST /api/mea-attestation/enquiry
 const createMeaEnquiry = async (req, res) => {
  console.log(req.body);

  try {
    const errors = validatePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // 1) Save in DB (attach userId when available)
    const doc = await MeaEnquiry.create({
      userId: req.user?.id || null,
      name: req.body.name || "",
      email: req.body.email,
      contact: req.body.contact,
      country: req.body.country,
      docCategory: req.body.docCategory,
      docType: req.body.docType,
      noOfDocuments: Number(req.body.noOfDocuments),
      documents: req.body.documents || [],
      enquiryDate: req.body.enquiryDate,
      submittedAt: new Date(req.body.submittedAt),
      tracking: req.body.tracking || {},
    });

    // 2) Send emails (user + admin)
    let userSent = false;
    let adminSent = false;

    // ✅ USER EMAIL
    try {
      const userMail = buildUserEmail(doc);
      await userMail.send(); // 👈 send attached inside builder
      userSent = true;
    } catch (e) {
      console.error("User email failed:", e.message);
      userSent = false;
    }

    // ✅ ADMIN EMAIL
    try {
      const adminMail = buildAdminEmail(doc);
      await adminMail.send(); // 👈 send attached inside builder
      adminSent = true;
    } catch (e) {
      console.error("Admin email failed:", e.message);
      adminSent = false;
    }

    // 3) Save email status (only if schema supports it)
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
    console.error("Create MEA enquiry error:", err);
    return res.status(500).json({
      message: "Server error",
      error: String(err?.message || err),
    });
  }
};


// GET /api/mea-attestation/enquiry
 const getAllMeaEnquiries = async (req, res) => {
  try {
    const items = await MeaEnquiry.find().sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// GET /api/mea-attestation/enquiry/my  -> returns enquiries for logged-in user
const getMyMeaEnquiries = async (req, res) => {
  try {
    console.log("[getMyMeaEnquiries] req.user:", req.user);
    const userId = req.user?.id;
    if (!userId) {
      console.log("[getMyMeaEnquiries] No userId found, returning 401");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const items = await MeaEnquiry.find({ userId }).sort({ createdAt: -1 });
    return res.json({ count: items.length, items });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// GET /api/mea-attestation/enquiry/:id
 const getMeaEnquiryById = async (req, res) => {
  try {
    const item = await MeaEnquiry.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// DELETE /api/mea-attestation/enquiry/:id
 const deleteMeaEnquiryById = async (req, res) => {
  try {
    const deleted = await MeaEnquiry.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    return res.json({ message: "Deleted successfully", id: deleted._id });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: String(err?.message || err) });
  }
};

// POST /api/mea-attestation/enquiry/:id/resend-email
 const resendMeaEnquiryEmailsById = async (req, res) => {
  try {
    const item = await MeaEnquiry.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });

    let userSent = false;
    let adminSent = false;

    try {
      const userMail = buildUserEmail(item);
      await sendMail({
        to: item.email,
        subject: userMail.subject,
        text: userMail.text,
        html: userMail.html,
      });
      userSent = true;
    } catch (e) {
      userSent = false;
    }

    try {
      const adminMail = buildAdminEmail(item);
      await sendMail({
        to: getAdminEmail(),
        subject: adminMail.subject,
        text: adminMail.text,
        html: adminMail.html,
      });
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


module.exports = {
  createMeaEnquiry,
  getAllMeaEnquiries,
  getMeaEnquiryById,
  deleteMeaEnquiryById,
  resendMeaEnquiryEmailsById,
  getMyMeaEnquiries,
};