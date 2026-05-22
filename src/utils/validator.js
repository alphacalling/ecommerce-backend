const { body, validationResult } = require("express-validator");

const registerValidation = [
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  body("name").trim().notEmpty(),
];

const loginValidation = [
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
];

const otpValidation = [
  body("email").isEmail(),
  body("otp").isLength({ min: 6, max: 6 }),
];

const resendOtpValidation = [body("email").isEmail()];

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

const addToCartValidation = [
  body("productId").isMongoId(),
  body("quantity").isInt({ min: 1 }),
];

const bannerValidation = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("image").trim().notEmpty().withMessage("Image URL is required"),
];

const checkoutValidator = [
  body("shippingAddress").isObject(),
  body("shippingAddress.street").trim().notEmpty(),
  body("shippingAddress.city").trim().notEmpty(),
  body("shippingAddress.state").trim().notEmpty(),
  body("shippingAddress.zipCode").trim().notEmpty(),
  body("shippingAddress.country").trim().notEmpty(),
];

module.exports = {
  registerValidation,
  otpValidation,
  resendOtpValidation,
  loginValidation,
  flashSaleValidation,
  createProductValidation,
  addToCartValidation,
  checkoutValidator,
  bannerValidation,
};
