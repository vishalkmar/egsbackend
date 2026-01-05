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

const HrdSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: false },

    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, trim: true },

    state: { type: String, default: "" },
    district: { type: String, default: "" },
    docType: { type: String, default: "" },
    selectedDocs: { type: [String], default: [] },
    docCount: { type: Number, default: 0 },

    message: { type: String, default: "" },

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

module.exports = mongoose.model('HrdAttestation', HrdSchema);
