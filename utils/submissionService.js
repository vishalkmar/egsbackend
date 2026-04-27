const { Op, fn, col, where: sqlWhere } = require("sequelize");
const { Document, StatusHistory, User, sequelize } = require("../models");

const STATUSES = ["Pending", "Approved", "Rejected", "Processing", "Dispatched", "Received"];
const PAYMENTS = ["Paid", "Pending"];

function parseDocuments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((d) => d && d.url)
    .map((d, i) => ({
      index: typeof d.index === "number" ? d.index : i,
      originalName: d.originalName || d.name || `file-${i}`,
      mimeType: d.mimeType || d.type || "application/octet-stream",
      size: Number(d.size || 0),
      url: String(d.url),
    }));
}

async function createSubmission({ Model, submissionType, payload, documentsInput, actor }) {
  return sequelize.transaction(async (t) => {
    const submission = await Model.create(payload, { transaction: t });

    const docs = parseDocuments(documentsInput);
    if (docs.length) {
      await Document.bulkCreate(
        docs.map((d) => ({
          ...d,
          submissionId: submission.id,
          submissionType,
        })),
        { transaction: t }
      );
    }

    await StatusHistory.create(
      {
        submissionId: submission.id,
        submissionType,
        fromStatus: null,
        toStatus: submission.status || "Pending",
        note: "Submission created",
        changedByRole: actor?.role || "user",
        changedByEmail: actor?.email || submission.email || null,
      },
      { transaction: t }
    );

    return submission;
  });
}

function buildListWhere({ query, userId }) {
  const where = {};
  if (userId) where.userId = userId;

  if (query.status) {
    const list = String(query.status).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) where.status = { [Op.in]: list };
  }
  if (query.payment) {
    const list = String(query.payment).split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) where.payment = { [Op.in]: list };
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt[Op.gte] = new Date(query.from);
    if (query.to) where.createdAt[Op.lte] = new Date(query.to);
  }

  return where;
}

function buildSearchClause(searchTerm, fields) {
  const term = String(searchTerm || "").trim();
  if (!term) return null;
  const like = `%${term.toLowerCase()}%`;
  return {
    [Op.or]: fields.map((f) => sqlWhere(fn("LOWER", col(f)), { [Op.like]: like })),
  };
}

async function listSubmissions({ Model, req, userId, searchFields = ["email", "name"], includeDocs = false }) {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
  const offset = (page - 1) * limit;

  const baseWhere = buildListWhere({ query: q, userId });
  const search = buildSearchClause(q.search, searchFields);
  const where = search ? { [Op.and]: [baseWhere, search] } : baseWhere;

  const sortField = ["createdAt", "submittedAt", "status"].includes(q.sortBy) ? q.sortBy : "createdAt";
  const sortDir = String(q.sortDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  const { rows, count } = await Model.findAndCountAll({
    where,
    order: [[sortField, sortDir]],
    limit,
    offset,
  });

  let items = rows;
  if (includeDocs && rows.length) {
    const submissionType = Model.SUBMISSION_TYPE;
    const submissionIds = rows.map((row) => row.id);
    const docs = await Document.findAll({
      where: {
        submissionType,
        submissionId: { [Op.in]: submissionIds },
      },
      order: [["index", "ASC"]],
    });

    const docsBySubmissionId = docs.reduce((acc, doc) => {
      const key = doc.submissionId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    }, {});

    items = rows.map((row) => {
      row.setDataValue("documents", docsBySubmissionId[row.id] || []);
      return row;
    });
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

async function getSubmissionById({ Model, id, withHistory = false }) {
  const item = await Model.findByPk(id);
  if (!item) return null;

  const submissionType = Model.SUBMISSION_TYPE;
  const [documents, statusHistory] = await Promise.all([
    Document.findAll({
      where: { submissionId: id, submissionType },
      order: [["index", "ASC"]],
    }),
    withHistory
      ? StatusHistory.findAll({
          where: { submissionId: id, submissionType },
          order: [["createdAt", "ASC"]],
        })
      : Promise.resolve([]),
  ]);

  item.setDataValue("documents", documents);
  if (withHistory) {
    item.setDataValue("statusHistory", statusHistory);
  }

  return item;
}

async function updateSubmissionStatus({ Model, submissionType, id, newStatus, note, actor }) {
  if (!STATUSES.includes(newStatus)) {
    const err = new Error(`Invalid status. Allowed: ${STATUSES.join(", ")}`);
    err.code = "INVALID_STATUS";
    throw err;
  }

  return sequelize.transaction(async (t) => {
    const item = await Model.findByPk(id, { transaction: t });
    if (!item) return null;

    const fromStatus = item.status;
    if (fromStatus === newStatus) return item;

    item.status = newStatus;
    await item.save({ transaction: t });

    await StatusHistory.create(
      {
        submissionId: item.id,
        submissionType,
        fromStatus,
        toStatus: newStatus,
        note: note || null,
        changedByRole: actor?.role || "admin",
        changedByEmail: actor?.email || null,
      },
      { transaction: t }
    );

    return item;
  });
}

async function updateSubmissionFields({ Model, id, updates }) {
  const item = await Model.findByPk(id);
  if (!item) return null;

  const ALLOWED = [
    "name", "email", "contact", "mobile", "phone", "country", "visaType", "noOfDays",
    "firstName", "lastName", "state", "district", "docType", "selectedDocs", "docCount",
    "message", "docCategory", "noOfDocuments", "companyName",
    "sourceLanguage", "targetLanguage", "category", "selectedDocType",
    "enquiryDate", "payment",
    "arrivalDate", "submissionDate", "submissionCountry",
    "travelDate", "returnDate", "tripDuration", "destination", "insuranceType",
    "specialRequirements",
  ];
  const safe = {};
  for (const k of ALLOWED) {
    if (Object.prototype.hasOwnProperty.call(updates, k)) safe[k] = updates[k];
  }

  await item.update(safe);
  return item;
}

async function deleteSubmission({ Model, submissionType, id }) {
  return sequelize.transaction(async (t) => {
    const item = await Model.findByPk(id, { transaction: t });
    if (!item) return false;

    await Document.destroy({
      where: { submissionId: id, submissionType },
      transaction: t,
    });
    await StatusHistory.destroy({
      where: { submissionId: id, submissionType },
      transaction: t,
    });
    await item.destroy({ transaction: t });
    return true;
  });
}

async function markEmailSent({ submission, kind }) {
  const emails = { ...(submission.emails || {}) };
  if (kind === "user") emails.userSent = true;
  if (kind === "admin") emails.adminSent = true;
  emails.lastEmailAt = new Date();
  submission.emails = emails;
  submission.changed("emails", true);
  await submission.save();
}

module.exports = {
  STATUSES,
  PAYMENTS,
  parseDocuments,
  createSubmission,
  listSubmissions,
  getSubmissionById,
  updateSubmissionStatus,
  updateSubmissionFields,
  deleteSubmission,
  markEmailSent,
};
