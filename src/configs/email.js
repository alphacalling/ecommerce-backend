const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true only for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Email configuration Error: ", error);
  } else {
    console.log("Email Server Ready");
  }
});

module.exports = transporter;
