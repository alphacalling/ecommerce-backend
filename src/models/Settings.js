const mongoose = require("mongoose");

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true, index: true },
    theme: {
      preset: {
        type: String,
        enum: [
          "violet",
          "indigo",
          "blue",
          "cyan",
          "teal",
          "green",
          "emerald",
          "amber",
          "orange",
          "red",
          "rose",
          "pink",
          "fuchsia",
          "slate",
          "custom",
        ],
        default: "violet",
      },
      mode: { type: String, enum: ["dark"], default: "dark" },
      customPrimary: {
        type: String,
        validate: {
          validator: (v) => !v || /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v),
          message: "customPrimary must be a hex color like #7c3aed",
        },
        default: null,
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", SettingsSchema);
