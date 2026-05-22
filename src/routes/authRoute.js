const router = require("express").Router();
const {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  logoutUser,
  me,
  getSession,
  deleteSession,
  listUsers,
  updateUserRole,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const {
  registerValidation,
  otpValidation,
  resendOtpValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require("../utils/validator");

const {
  authLimiter,
  otpLimiter,
} = require("../middlewares/rateLimitMiddleware");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.post("/register", registerValidation, authLimiter, registerUser);
router.post("/verify-otp", otpValidation, authLimiter, verifyOtp);
router.post("/login", loginValidation, authLimiter, loginUser);
router.post("/resend-otp", resendOtpValidation, authLimiter, resendOtp);
router.post("/logout", protect, logoutUser);
router.get("/me", protect, me);
router.get("/session", protect, getSession);
router.delete("/session", protect, deleteSession);

// Password management
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  otpLimiter,
  forgotPassword,
);
router.post(
  "/reset-password",
  resetPasswordValidation,
  authLimiter,
  resetPassword,
);
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  authLimiter,
  changePassword,
);

// Admin user management
router.get("/users", protect, adminOnly, listUsers);
router.put("/users/:id/role", protect, adminOnly, updateUserRole);

module.exports = router;
