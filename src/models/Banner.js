const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "/products",
    },
    ctaText: {
      type: String,
      default: "Shop Now",
    },
    badge: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Banner", bannerSchema);
