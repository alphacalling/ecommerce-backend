const express = require("express");
const { searchLimiter } = require("../middlewares/rateLimitMiddleware");
const {
  optionalAuth,
  protect,
  adminOnly,
} = require("../middlewares/authMiddleware");
const {
  getProducts,
  getTrendingProducts,
  getFlashSale,
  getProductById,
  getProductSearch,
  getRecentlyViewed,
  createProduct,
  updateProduct,
  createFlashSale,
} = require("../controllers/productController");
const {
  trackSearch,
  trackProductView,
} = require("../middlewares/analyticsMiddleware");
const {
  createProductValidation,
  flashSaleValidation,
} = require("../utils/validator");

const router = express.Router();

router.get("/", optionalAuth, getProducts);
router.get("/search", searchLimiter, trackSearch, getProductSearch);
router.get("/trending", getTrendingProducts);
router.get("/flash-sale", getFlashSale);
router.get("/view/:id", optionalAuth, trackProductView, getProductById);
router.get("/user/recently-viewed", protect, getRecentlyViewed);
router.put("/update/:id", protect, adminOnly, updateProduct);
router.post(
  "/:id/flash-sale",
  protect,
  adminOnly,
  flashSaleValidation,
  createFlashSale,
);
router.post(
  "/create",
  protect,
  adminOnly,
  createProductValidation,
  createProduct,
);

module.exports = router;
