const { sequelize } = require("../config/db");

const User = require("./userAuthModel/UserModel");
const UserOtp = require("./userAuthModel/userOtpModel");
const EVisa = require("./eVisaModels/EVisaModel");
const Hrd = require("./hrdModels/HrdAttestationModel");
const MeaEnquiry = require("./meaEnquiryModels/MeaEnqueryModel");
const PccLegalization = require("./pccLegalizationModels/PccLegalizationModel");
const StickerVisa = require("./stickerVisaModels/StickerVisaModel");
const Translation = require("./translationModels/TranslationModel");
const AssistantAppointment = require("./assistantAppointmentModels/AssistantAppointmentModel");
const Insurance = require("./insuranceModels/InsuranceModel");
const MeetGreet = require("./meetGreetModels/MeetGreetModel");
const Document = require("./Document");
const StatusHistory = require("./StatusHistory");

const SUBMISSION_MODELS = {
  evisa: EVisa,
  hrd: Hrd,
  mea: MeaEnquiry,
  pcc: PccLegalization,
  sticker_visa: StickerVisa,
  translation: Translation,
  assistant_appointment: AssistantAppointment,
  insurance: Insurance,
  meet_greet: MeetGreet,
};

function initModels() {
  User.hasMany(EVisa, { foreignKey: "userId", as: "eVisas" });
  User.hasMany(Hrd, { foreignKey: "userId", as: "hrds" });
  User.hasMany(MeaEnquiry, { foreignKey: "userId", as: "meaEnquiries" });
  User.hasMany(PccLegalization, { foreignKey: "userId", as: "pccLegalizations" });
  User.hasMany(StickerVisa, { foreignKey: "userId", as: "stickerVisas" });
  User.hasMany(Translation, { foreignKey: "userId", as: "translations" });
  User.hasMany(AssistantAppointment, { foreignKey: "userId", as: "assistantAppointments" });
  User.hasMany(Insurance, { foreignKey: "userId", as: "insurances" });
  User.hasMany(MeetGreet, { foreignKey: "userId", as: "meetGreets" });

  EVisa.belongsTo(User, { foreignKey: "userId", as: "user" });
  Hrd.belongsTo(User, { foreignKey: "userId", as: "user" });
  MeaEnquiry.belongsTo(User, { foreignKey: "userId", as: "user" });
  PccLegalization.belongsTo(User, { foreignKey: "userId", as: "user" });
  StickerVisa.belongsTo(User, { foreignKey: "userId", as: "user" });
  Translation.belongsTo(User, { foreignKey: "userId", as: "user" });
  AssistantAppointment.belongsTo(User, { foreignKey: "userId", as: "user" });
  Insurance.belongsTo(User, { foreignKey: "userId", as: "user" });
  MeetGreet.belongsTo(User, { foreignKey: "userId", as: "user" });

  Object.entries(SUBMISSION_MODELS).forEach(([type, Model]) => {
    Model.hasMany(Document, {
      foreignKey: "submissionId",
      constraints: false,
      scope: { submissionType: type },
      as: "documents",
    });
    Model.hasMany(StatusHistory, {
      foreignKey: "submissionId",
      constraints: false,
      scope: { submissionType: type },
      as: "statusHistory",
    });
  });
}

module.exports = {
  sequelize,
  initModels,
  User,
  UserOtp,
  EVisa,
  Hrd,
  MeaEnquiry,
  PccLegalization,
  StickerVisa,
  Translation,
  AssistantAppointment,
  Insurance,
  MeetGreet,
  Document,
  StatusHistory,
  SUBMISSION_MODELS,
  SUBMISSION_TYPES: Object.keys(SUBMISSION_MODELS),
};
