const { emailQueue } = require("../services/queueService");
const emailService = require("../services/emailService");

emailQueue.process("send-otp", async (job) => {
  const { email, otp, name } = job.data;
  console.log(`Sending OTP email to ${email}`);
  const result = await emailService.sendOTPEmail(email, otp, name);
  if (!result.success) {
    throw new Error(result.error);
  }

  return result;
});

emailQueue.process("send-welcome", async (job) => {
  const { email, name } = job.data;
  console.log(`Sending welcome email to ${email}`);

  const result = await emailService.sendWelcomeEmail(email, name);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result;
});

emailQueue.process("send-password-reset", async (job) => {
  const { email, code, name } = job.data;
  console.log(`Sending password-reset email to ${email}`);
  const result = await emailService.sendPasswordResetEmail(email, code, name);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result;
});

emailQueue.process("send-order-confirmation", async (job) => {
  const { email, orderDetails } = job.data;
  console.log(`Sending order confirmation to ${email}`);

  const result = await emailService.sendOrderConfirmation(email, orderDetails);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result;
});

// Event listeners
emailQueue.on("completed", (job, result) => {
  console.log(`✅ Email job ${job.id} completed`);
});

emailQueue.on("failed", (job, err) => {
  console.error(`❌ Email job ${job.id} failed:`, err.message);
});

console.log("Email worker started");
