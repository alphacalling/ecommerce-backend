const express = require("express");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getSettings,
  updateTheme,
} = require("../controllers/settingsController");

const router = express.Router();

router.get("/", getSettings);
router.put("/theme", protect, adminOnly, updateTheme);

module.exports = router;
