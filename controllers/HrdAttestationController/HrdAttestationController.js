const Hrd = require("../../models/hrdModels/HrdAttestationModel.js");
const { buildAdminEmail, buildUserEmail } = require("../../utils/hrdEmailService.js");

const createHrd = async (req, res) => {
  try {
    const data = req.body;

    // Basic required validation
    if (!data.email || !data.mobile) {
      return res.status(400).json({ success: false, message: "Email and mobile are required" });
    }

    const doc = await Hrd.create({
      userId: req.user?.id || null,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      email: data.email,
      mobile: data.mobile,
      state: data.state || "",
      district: data.district || "",
      docType: data.docType || "",
      selectedDocs: Array.isArray(data.selectedDocs) ? data.selectedDocs : data.selectedDocs ? [data.selectedDocs] : [],
      docCount: data.docCount ? Number(data.docCount) : 0,
      message: data.message || "",
      documents: Array.isArray(data.documents) ? data.documents : [],
      enquiryDate: data.enquiryDate || new Date().toISOString().split("T")[0],
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : new Date(),
      tracking: data.tracking || {},
    });

    // send emails
    const userEmail = buildUserEmail(doc);
    try {
      await userEmail.send();
      doc.emails.userSent = true;
      doc.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("HRD: user email send failed", e?.message || e);
    }

    const adminEmail = buildAdminEmail(doc);
    try {
      await adminEmail.send();
      doc.emails.adminSent = true;
      doc.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("HRD: admin email send failed", e?.message || e);
    }

    await doc.save();

    return res.json({ success: true, item: doc, message: "HRD Attestation enquiry received" });
  } catch (err) {
    console.error("Create HRD enquiry error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllHrds = async (req, res) => {
  try {
    const items = await Hrd.find().sort({ createdAt: -1 });
    return res.json({ success: true, items });
  } catch (err) {
    console.error("Get all HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMyHrds = async (req, res) => {
  try {
    const userId = req.user?.id;
    const items = await Hrd.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, items });
  } catch (err) {
    console.error("Get my HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getHrdById = async (req, res) => {
  try {
    const item = await Hrd.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item });
  } catch (err) {
    console.error("Get HRD by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteHrdById = async (req, res) => {
  try {
    const deleted = await Hrd.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Delete HRD by id error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const resendHrdEmailsById = async (req, res) => {
  try {
    const item = await Hrd.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });

    const userEmail = buildUserEmail(item);
    const adminEmail = buildAdminEmail(item);

    try {
      await userEmail.send();
      item.emails.userSent = true;
      item.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("Resend HRD: user email failed", e?.message || e);
    }

    try {
      await adminEmail.send();
      item.emails.adminSent = true;
      item.emails.lastEmailAt = new Date();
    } catch (e) {
      console.error("Resend HRD: admin email failed", e?.message || e);
    }

    await item.save();
    return res.json({ success: true, item, message: "Emails resent" });
  } catch (err) {
    console.error("Resend HRD emails error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateHrdById = async (req, res) => {
  try {
    const updates = req.body || {};
    const updated = await Hrd.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error("Update HRD error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createHrd,
  getAllHrds,
  getHrdById,
  deleteHrdById,
  resendHrdEmailsById,
  getMyHrds,
  updateHrdById,
};