const mongoose = require("mongoose");

const viewHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sessionId: String,
    ip: String,
    duration: Number,
    source: String,
  },
  { timestamps: true },
);

viewHistorySchema.index({ productId: 1, createdAt: -1 });
viewHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.modell("ViewHistory", viewHistorySchema);
