const nodemailer = require("nodemailer");
require("dotenv").config();

const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const buildUserEmail = (enquiry) => {
  const subject = "HRD Attestation Enquiry Received";

  const text = `
Dear ${enquiry.firstName?.trim() ? enquiry.firstName : "Applicant"},

We have received your HRD Attestation enquiry.

Enquiry Details:
- Email: ${enquiry.email}
- Mobile: ${enquiry.mobile}
- State: ${enquiry.state}
- Document Type: ${enquiry.docType}
- Total Documents: ${enquiry.docCount}
- Enquiry Date: ${enquiry.enquiryDate}
- Submitted At: ${new Date(enquiry.submittedAt).toLocaleString()}

We will contact you shortly.

Regards,
EGS Group
`.trim();

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <p>Dear <b>${enquiry.firstName?.trim() ? enquiry.firstName : "Applicant"}</b>,</p>
    <p>We have received your HRD Attestation enquiry.</p>
    <h3 style="margin:16px 0 8px">Enquiry Details</h3>
    <ul>
      <li><b>Email:</b> ${enquiry.email}</li>
      <li><b>Mobile:</b> ${enquiry.mobile}</li>
      <li><b>State:</b> ${enquiry.state}</li>
      <li><b>Document Type:</b> ${enquiry.docType}</li>
      <li><b>Total Documents:</b> ${enquiry.docCount}</li>
      <li><b>Enquiry Date:</b> ${enquiry.enquiryDate}</li>
      <li><b>Submitted At:</b> ${new Date(enquiry.submittedAt).toLocaleString()}</li>
    </ul>
    <p>We will contact you shortly.</p>
    <p style="margin-top:18px">Regards,<br/>EGS Group</p>
  </div>
  `.trim();

  const send = async () => {
    const transporter = getTransporter();

    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM missing in env.");

    const to = enquiry.email;
    if (!to) throw new Error("enquiry.email missing for user email.");

    return transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  };

  return { subject, text, html, send };
};

const buildAdminEmail = (enquiry) => {
  const subject = `New HRD Attestation Enquiry: ${enquiry.email} (${enquiry.docType})`;

  const docsHtml = (enquiry.documents || [])
    .map(
      (d) =>
        `<li>#${d.index} - ${d.originalName} (${Math.round(
          d.size / 1024
        )} KB) - <a href="${d.url}" target="_blank" rel="noreferrer">Open</a></li>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <h2 style="margin:0 0 12px">New HRD Attestation Enquiry</h2>
    <ul>
      <li><b>Name:</b> ${enquiry.firstName || "-"} ${enquiry.lastName || ""}</li>
      <li><b>Email:</b> ${enquiry.email}</li>
      <li><b>Mobile:</b> ${enquiry.mobile}</li>
      <li><b>State:</b> ${enquiry.state}</li>
      <li><b>Document Type:</b> ${enquiry.docType}</li>
      <li><b>Total Documents:</b> ${enquiry.docCount}</li>
      <li><b>Enquiry Date:</b> ${enquiry.enquiryDate}</li>
      <li><b>Submitted At:</b> ${new Date(enquiry.submittedAt).toLocaleString()}</li>
    </ul>
    <h3 style="margin:16px 0 8px">Documents (Cloudinary URLs)</h3>
    <ol>${docsHtml || "<li>No documents</li>"}</ol>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <p style="margin:0"><b>Tracking</b></p>
    <p style="margin:6px 0 0"><b>Page:</b> ${enquiry.tracking?.pageUrl || "-"}</p>
    <p style="margin:6px 0 0"><b>User Agent:</b> ${enquiry.tracking?.userAgent || "-"}</p>
  </div>
  `.trim();

  const text = `
New HRD Attestation Enquiry

Name: ${enquiry.firstName || "-"} ${enquiry.lastName || ""}
Email: ${enquiry.email}
Mobile: ${enquiry.mobile}
State: ${enquiry.state}
Document Type: ${enquiry.docType}
Total Documents: ${enquiry.docCount}
Enquiry Date: ${enquiry.enquiryDate}
Submitted At: ${new Date(enquiry.submittedAt).toLocaleString()}

Documents:
${(enquiry.documents || []).map((d) => `#${d.index} - ${d.url}`).join("\n")}

Tracking:
Page: ${enquiry.tracking?.pageUrl || "-"}
UA: ${enquiry.tracking?.userAgent || "-"}
`.trim();

  const send = async () => {
    const transporter = getTransporter();

    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM missing in env.");

    const to = process.env.EMAIL_TO;
    if (!to) throw new Error("EMAIL_TO missing in env.");

    return transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  };

  return { subject, text, html, send };
};

module.exports = {
  buildUserEmail,
  buildAdminEmail,
};
