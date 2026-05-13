const { body, validationResult } = require("express-validator");

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().notEmpty(),
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
];

const otpValidation = [
  body("email").isEmail().normalizeEmail(),
  body("otp").isLength({ min: 6, max: 6 }),
];

const resendOtpValidation = [body("email").isEmail().normalizeEmail()];

module.exports = {
  registerValidation,
  otpValidation,
  resendOtpValidation,
  loginValidation,
};
