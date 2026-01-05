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

const TranslationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: false },
    name: { type: String, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },
    contact: { type: String, required: true, trim: true },
    // flexible fields to support frontend form
    sourceLanguage: { type: String, required: false },
    targetLanguage: { type: String, required: false },
    category: { type: String, required: false },
    selectedDocType: { type: String, required: false },
    docType: { type: String, required: false },
    country: { type: String, required: false },
    noOfDocuments: { type: Number, required: true },

    documents: { type: [UploadedDocSchema], default: [] },

    enquiryDate: { type: String, required: true },
    submittedAt: { type: Date, required: true },
    tracking: { type: TrackingSchema, default: {} },

    emails: {
      userSent: { type: Boolean, default: false },
      adminSent: { type: Boolean, default: false },
      lastEmailAt: { type: Date, default: null },
    },

    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Dispatched', 'Received'], default: 'Pending' },
    payment: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Translation', TranslationSchema);
