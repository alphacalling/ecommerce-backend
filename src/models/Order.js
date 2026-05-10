const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        quantity: Number,
        price: Number,
        total: Number,
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: Sting,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Order", orderSchema);
