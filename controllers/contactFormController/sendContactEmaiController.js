const { z } = require("zod");
const nodemailer = require("nodemailer");

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[0-9+\-\s()]{8,20}$/),
  email: z
    .string()
    .trim()
    .min(6)
    .max(120)
    .regex(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/),
  serviceType: z.string().trim().min(2).max(60),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildHtml = ({ name, phone, email, serviceType, message }) => {
  const safe = {
    name: escapeHtml(name),
    phone: escapeHtml(phone),
    email: escapeHtml(email),
    serviceType: escapeHtml(serviceType),
    message: escapeHtml(message || "—"),
  };

  return `
  <div style="font-family: Arial, sans-serif; background:#f6f7fb; padding:24px;">
    <div style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #eaeef5;">
      <div style="background: linear-gradient(90deg,#0ea5e9,#2563eb,#7c3aed); padding:16px 20px;">
        <div style="color:#fff; font-size:18px; font-weight:700;">New Contact Enquiry</div>
        <div style="color:rgba(255,255,255,0.85); font-size:12px; margin-top:4px;">EGS Website Contact Form</div>
      </div>

      <div style="padding:18px 20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr>
            <td style="padding:10px 0; color:#64748b; width:140px;">Name</td>
            <td style="padding:10px 0; color:#0f172a; font-weight:600;">${safe.name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#64748b;">Phone</td>
            <td style="padding:10px 0; color:#0f172a; font-weight:600;">${safe.phone}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#64748b;">Email</td>
            <td style="padding:10px 0;">
              <a href="mailto:${safe.email}" style="color:#2563eb; text-decoration:none; font-weight:600;">${safe.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#64748b;">Service Type</td>
            <td style="padding:10px 0; color:#0f172a; font-weight:600;">${safe.serviceType}</td>
          </tr>
        </table>

        <div style="margin-top:14px; padding:14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px;">
          <div style="font-size:13px; color:#64748b; font-weight:700; margin-bottom:8px;">Message</div>
          <div style="white-space:pre-wrap; color:#0f172a; font-size:14px; line-height:1.6;">${safe.message}</div>
        </div>

        <div style="margin-top:16px; font-size:12px; color:#64748b;">
          Sent on: <b>${new Date().toLocaleString("en-IN")}</b>
        </div>
      </div>
    </div>
  </div>
  `;
};

exports.sendContactEmail = async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid input",
      });
    }

    const { name, phone, email, serviceType, message } = parsed.data;

    const to = process.env.EMAIL_TO;
    if (!to) {
      return res.status(500).json({ success: false, message: "Contact email not configured" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const subject = `New Enquiry: ${serviceType} — ${name}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      replyTo: email,
      subject,
      html: buildHtml({ name, phone, email, serviceType, message }),
      text: `New Contact Enquiry\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${serviceType}\nMessage: ${message || "-"}`,
    });

    return res.status(200).json({ success: true, message: "Message sent" });
  } catch (err) {
    console.error("sendContactEmail error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
