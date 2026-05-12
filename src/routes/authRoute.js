const router = require("express").Router();
const { authLimiter } = require("../middlewares/rateLimitMiddleware");
const { registerUser } = require("../controllers/authController");
const { registerValidation } = require("../utils/validator");

router.post("/register", registerValidation, authLimiter, registerUser);

module.exports = router;
