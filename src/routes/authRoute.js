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
} = require("../controllers/authController");
const {
  registerValidation,
  otpValidation,
  resendOtpValidation,
  loginValidation,
} = require("../utils/validator");

const { authLimiter } = require("../middlewares/rateLimitMiddleware");
const { protect } = require("../middlewares/authMiddleware");

router.post("/register", registerValidation, authLimiter, registerUser);
router.post("/verify-otp", otpValidation, authLimiter, verifyOtp);
router.post("/login", loginValidation, authLimiter, loginUser);
router.post("/resend-otp", resendOtpValidation, authLimiter, resendOtp);
router.post("/logout", protect, logoutUser);
router.get("/me", protect, me);
router.get("/session", protect, getSession);
router.delete("/session", protect, deleteSession);

module.exports = router;
