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

const createProductValidation = [
  body("name").trim().notEmpty(),
  body("description").trim().notEmpty(),
  body("price").isFloat({ min: 0 }),
  body("category").trim().notEmpty(),
  body("stock").isInt({ min: 0 }),
];

const flashSaleValidation = [
  body("startTime").isISO8601(),
  body("endTime").isISO8601(),
  body("discountPercentage").isFloat({ min: 0, max: 100 }),
];

module.exports = {
  registerValidation,
  otpValidation,
  resendOtpValidation,
  loginValidation,
  flashSaleValidation,
  createProductValidation,
};
