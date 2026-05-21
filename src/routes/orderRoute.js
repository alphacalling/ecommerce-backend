const {
  addToCart,
  getUserCart,
  removeItem,
  checkoutAndCreateOrder,
  getUserOrder,
  getSingleOrder,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");
const {
  addToCartValidation,
  checkoutValidator,
} = require("../utils/validator");

const router = require("express").Router();

router.post("/addcart", protect, addToCartValidation, addToCart);
router.get("/cart", protect, getUserCart);
router.delete("/removecart/:itemId", protect, removeItem);
router.post("/checkout", protect, checkoutValidator, checkoutAndCreateOrder);
router.get("/", protect, getUserOrder);
router.get("/:id", protect, getSingleOrder);

module.exports = router;
