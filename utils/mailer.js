const nodemailer = require("nodemailer");

// Explicit SMTP config (more reliable on shared hosting than `service: "gmail"`).
// Port 465 + secure:true tends to work even when 587 STARTTLS is filtered.
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
};

const sendOtpEmail = async ({ to, otp }) => {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Your Login OTP",
    text: `Your OTP is ${otp}. It will expire soon. Do not share it with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>Your Login OTP</h2>
        <p>Your OTP is:</p>
        <div style="font-size:24px; font-weight:700; letter-spacing:3px">${otp}</div>
        <p>This OTP will expire shortly. Do not share it with anyone.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
