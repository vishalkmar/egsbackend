const nodemailer = require("nodemailer");
require("dotenv").config();

const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Gmail login
      pass: process.env.EMAIL_PASS, // App password
    },
  });
};

/**
 * ✅ USER EMAIL (to enquiry.email)
 * returns: { subject, text, html, send() }
 */
const buildUserEmail = (enquiry) => {
  const subject = "PCC Legalization Enquiry Received";

  const text = `
Dear ${enquiry.name?.trim() ? enquiry.name : "Applicant"},

We have received your PCC Legalization enquiry.

Enquiry Details:
- Email: ${enquiry.email}
- Phone: ${enquiry.phone}
- Country: ${enquiry.country}
- Company Name: ${enquiry.companyName}
- No. of Documents: ${enquiry.noOfDocuments}
- Submitted At: ${new Date(enquiry.submittedAt).toLocaleString()}

We will contact you shortly with the next steps.

Regards,
EGS Group
`.trim();

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
    <p>Dear <b>${enquiry.name?.trim() ? enquiry.name : "Applicant"}</b>,</p>
    <p>We have received your PCC Legalization enquiry.</p>
    <h3 style="margin:16px 0 8px">Enquiry Details</h3>
    <ul>
      <li><b>Email:</b> ${enquiry.email}</li>
      <li><b>Phone:</b> ${enquiry.phone}</li>
      <li><b>Country:</b> ${enquiry.country}</li>
      <li><b>Company Name:</b> ${enquiry.companyName}</li>
      <li><b>No. of Documents:</b> ${enquiry.noOfDocuments}</li>
      <li><b>Submitted At:</b> ${new Date(enquiry.submittedAt).toLocaleString()}</li>
    </ul>
    <p>We will contact you shortly with the next steps.</p>
    <p style="margin-top:18px">Regards,<br/>EGS Group</p>
  </div>
  `.trim();

  // ✅ send attached here (no separate sendMail)
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

/**
 * ✅ ADMIN EMAIL (to process.env.EMAIL_TO)
 * returns: { subject, text, html, send() }
 */
const buildAdminEmail = (enquiry) => {
  const subject = `New PCC Legalization Enquiry: ${enquiry.email} (${enquiry.country})`;

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
    <h2 style="margin:0 0 12px">New PCC Legalization Enquiry</h2>
    <ul>
      <li><b>Name:</b> ${enquiry.name || "-"}</li>
      <li><b>Email:</b> ${enquiry.email}</li>
      <li><b>Phone:</b> ${enquiry.phone}</li>
      <li><b>Country:</b> ${enquiry.country}</li>
      <li><b>Company Name:</b> ${enquiry.companyName}</li>
      <li><b>No. of Documents:</b> ${enquiry.noOfDocuments}</li>
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
New PCC Legalization Enquiry

Name: ${enquiry.name || "-"}
Email: ${enquiry.email}
Phone: ${enquiry.phone}
Country: ${enquiry.country}
Company Name: ${enquiry.companyName}
No. of Documents: ${enquiry.noOfDocuments}
Submitted At: ${new Date(enquiry.submittedAt).toLocaleString()}

Documents:
${(enquiry.documents || []).map((d) => `#${d.index} - ${d.url}`).join("\n")}

Tracking:
Page: ${enquiry.tracking?.pageUrl || "-"}
UA: ${enquiry.tracking?.userAgent || "-"}
`.trim();

  // ✅ send attached here (no separate sendMail)
  const send = async () => {
    const transporter = getTransporter();

    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM missing in env.");

    const to = process.env.EMAIL_TO;
    if (!to) throw new Error("EMAIL_TO missing for admin email.");

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

module.exports = { buildUserEmail, buildAdminEmail };
