const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    resultCount: Number,
    clickProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    ip: String,
  },
  { timestamps: true },
);

searchHistorySchema.index({ query: 1, createdAt: -1 });

module.exports = mongoose.model("SearchHistory", searchHistorySchema);
