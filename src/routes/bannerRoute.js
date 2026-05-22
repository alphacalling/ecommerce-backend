const router = require("express").Router();
const {
  getActiveBanners,
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} = require("../controllers/bannerController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const { bannerValidation } = require("../utils/validator");

router.get("/", getActiveBanners);
router.get("/all", protect, adminOnly, listAllBanners);
router.post("/", protect, adminOnly, bannerValidation, createBanner);
router.put("/:id", protect, adminOnly, updateBanner);
router.delete("/:id", protect, adminOnly, deleteBanner);

module.exports = router;
