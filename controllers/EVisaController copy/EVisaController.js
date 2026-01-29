const EVisa = require("../../models/eVisaModels/EVisaModel.js");
const { buildAdminEmail, buildUserEmail } = require("../../utils/eVisaEmailService.js");

const createEVisa = async (req, res) => {
  try {
    const data = req.body;

    const doc = await EVisa.create({
      userId: req.user?.id || null,
      name: data.name || "",
      email: data.email,
      contact: data.contact,
      country: data.country || "",
      visaType: data.visaType,
      noOfDays: data.noOfDays || 0,
      documents: data.documents || [],
      enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      tracking: data.tracking || {},
    });

    // Attempt to send emails
    const userEmail = buildUserEmail(doc);
    try {
      await userEmail.send();
      doc.emails.userSent = true;
      doc.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("E-Visa: user email send failed", e.message || e);
    }

    const adminEmail = buildAdminEmail(doc);
    try {
      await adminEmail.send();
      doc.emails.adminSent = true;
      doc.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("E-Visa: admin email send failed", e.message || e);
    }

    await doc.save();

    return res.json({ success: true, item: doc, message: "E-Visa enquiry received" });
  } catch (err) {
    console.error("Create E-Visa enquiry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllEVisas = async (req, res) => {
  try {
    const items = await EVisa.find().sort({ createdAt: -1 });
    return res.json({ success: true, items });
  } catch (err) {
    console.error("Get all E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyEVisas = async (req, res) => {
  try {
    const userId = req.user?.id;
    const items = await EVisa.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, items });
  } catch (err) {
    console.error("Get my E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEVisaById = async (req, res) => {
  try {
    const item = await EVisa.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get E-Visa by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteEVisaById = async (req, res) => {
  try {
    const deleted = await EVisa.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete E-Visa by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const resendEVisaEmailsById = async (req, res) => {
  try {
    const item = await EVisa.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const userEmail = buildUserEmail(item);
    const adminEmail = buildAdminEmail(item);
    try {
      await userEmail.send();
      item.emails.userSent = true;
      item.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("Resend E-Visa: user email failed", e.message || e);
    }

    try {
      await adminEmail.send();
      item.emails.adminSent = true;
      item.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("Resend E-Visa: admin email failed", e.message || e);
    }

    await item.save();

    return res.json({ success: true, item, message: "Emails resent" });
  } catch (err) {
    console.error("Resend E-Visa emails error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEVisaById = async (req, res) => {
  try {
    const updates = req.body || {};
    const updated = await EVisa.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("Update E-Visa error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createEVisa,
  getAllEVisas,
  getEVisaById,
  deleteEVisaById,
  resendEVisaEmailsById,
  getMyEVisas,
  updateEVisaById,
};