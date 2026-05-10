const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      reuired: true,
      trim: true,
      index: "text",
    },
    description: {
      type: String,
      required: true,
      index: "text",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
      reuired: true,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    images: [String],
    isflashSale: {
      type: Boolean,
      default: false,
    },
    flsahSale: {
      isActive: { type: Boolean, default: false },
      startTime: Date,
      endTime: Date,
      discountPercentage: Number,
      maxQuantity: Number,
      soldCount: { type: Number, default: 0 },
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    trending: {
      score: { type: Number, default: 0 },
      lastCalculated: Date,
    },
    tags: [String],
  },
  { timestamps: true },
);

// text score 
productSchema.index({ name: "text", description: "text", tags: "text" });

// trending score 
productSchema.methods.calculateTrendingScore = function () {
  const hourSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const viewScore = this.count * 1;
  const purchaseScore = this.purchaseCount * 10;
  const ratingScore = this.rating.average * this.rating.count * 5;

  this.trending.score =
    (viewScore + purchaseScore + ratingScore) /
    Math.pow(hoursSinceCreation + 2, 1.5);
  this.trending.lastCalculated = new Date();
};
