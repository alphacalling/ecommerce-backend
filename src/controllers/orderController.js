const { validationResult } = require("express-validator");
const Product = require("../models/Product");
const cacheService = require("../services/cacheService");
const Cart = require("../models/Cart");
const analyticsService = require("../services/analyticsService");
const Order = require("../models/Order");
const { generateOrderNumber, paginate, paginationResponse } = require("../utils/helper");
const {queueService} = require("../services/queueService");
const notificationService = require("../services/notificationService");

const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { productId, quantity } = req.body;
    const userId = req.user._id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    await cacheService.lockInventory(
      productId,
      userId.toString(),
      quantity,
      parseInt(process.env.CART_EXPIRY),
    );

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        expiresAt: new Date(
          Date.now() + parseInt(process.env.CART_EXPIRY) * 1000,
        ),
      });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.discountPrice || product.price,
      });
    }

    cart.expiresAt = new Date(
      Date.now() + parseInt(process.env.CART_EXPIRY) * 1000,
    );
    await cart.save();

    await analyticsService.trackAddToCart({
      userId: userId.toString(),
      productId,
      quantity,
      price: product.price,
    });

    res.json({
      success: true,
      message: "Item added to cart",
      data: cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getUserCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id }).populate(
      "items.productId",
      "name price discountPrice images stock",
    );
    if (!cart) {
      return res.json({
        success: true,
        data: { items: [], total: 0 },
      });
    }

    const total = cart.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
    res.json({
      success: true,
      data: {
        items: cart.items,
        total,
        expiresAt: cart.expiresAt,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const removeItem = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    await cacheService.releaseInventoryLock(
      item.productId.toString(),
      req.user._id.toString(),
    );
    // item.remove();
    cart.items.pull(req.params.itemId);
    await cart.save();

    res.json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const checkoutAndCreateOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { shippingAddress } = req.body;
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }
    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.productId;

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }
      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      });

      totalAmount += item.price * item.quantity;
    }
    const order = await Order.create({
      userId,
      orderNumber: generateOrderNumber(),
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: "pending",
      paymentStatus: "pending",
    });
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity, purchaseCount: item.quantity },
      });

      await cacheService.releaseInventoryLock(
        item.productId.toString(),
        userId.toString(),
      );
    }
    await Cart.deleteOne({ userId });

    await queueService.    processOrder(order._id.toString());

    await queueService.sendOrderConfirmation(req.user.email, {
      orderNumber: order.orderNumber,
      items: orderItems,
      totalAmount,
      shippingAddress,
    });
    await analyticsService.trackPurchase({
      userId: userId.toString(),
      orderId: order._id.toString(),
      items: orderItems.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
    });
    await notificationService.notifyOrderStatus(userId.toString(), {
      orderNumber: order.orderNumber,
      status: "confirmed",
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getUserOrder = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query).sort("-createdAt").skip(skip).limit(limitNum).lean(),
      Order.countDocuments(query),
    ]);

    const response = paginationResponse(
      orders,
      total,
      parseInt(page),
      limitNum,
    );

    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getSingleOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate("items.productId", "name images");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getUserCart,
  removeItem,
  checkoutAndCreateOrder,
  getUserOrder,
  getSingleOrder,
};
