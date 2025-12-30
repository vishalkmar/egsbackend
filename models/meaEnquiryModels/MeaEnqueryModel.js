const mongoose = require('mongoose')

const UploadedDocSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const TrackingSchema = new mongoose.Schema(
  {
    pageUrl: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { _id: false }
);

const MeaEnquirySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: false },
    // form fields
    name: { type: String, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },
    contact: { type: String, required: true, trim: true },
    country: { type: String, required: true },
    docCategory: { type: String, required: true },
    docType: { type: String, required: true },
    noOfDocuments: { type: Number, required: true },

    // urls array
    documents: { type: [UploadedDocSchema], default: [] },

    // extra fields
    enquiryDate: { type: String, required: true }, // yyyy-mm-dd
    submittedAt: { type: Date, required: true },
    tracking: { type: TrackingSchema, default: {} },

    // email tracking
    emails: {
      userSent: { type: Boolean, default: false },
      adminSent: { type: Boolean, default: false },
      lastEmailAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("MeaEnquiry", MeaEnquirySchema);
