const mongoose = require("mongoose");

const inventoryLockSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "true",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    expiresAt: {
      type: Date,
      default: () => Date(Date.now() + 5 * 60 * 1000),
      index: true,
    },
    sessionId: String,
  },
  { timestamps: true },
);

inventoryLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

inventoryLockSchema.index({ productId: 1, userId: 1 });

module.exports = mongoose.model("InventoryLock", inventoryLockSchema);
