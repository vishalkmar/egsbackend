const nodemailer = require("nodemailer");

const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
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
