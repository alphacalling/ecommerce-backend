const Settings = require("../models/Settings");
const cacheService = require("../services/cacheService");

const CACHE_KEY = "settings:global";
const CACHE_TTL = 3600;

const VALID_PRESETS = new Set([
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
]);

const HEX_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const findOrCreate = async () => {
  let doc = await Settings.findOne({ key: "global" });
  if (!doc) doc = await Settings.create({ key: "global" });
  return doc;
};

exports.getSettings = async (req, res) => {
  try {
    const cached = await cacheService.get(CACHE_KEY);
    if (cached) {
      return res.json({ success: true, cached: true, data: cached });
    }

    const doc = await findOrCreate();
    const payload = {
      theme: {
        preset: doc.theme.preset,
        mode: doc.theme.mode,
        customPrimary: doc.theme.customPrimary,
      },
    };

    await cacheService.set(CACHE_KEY, payload, CACHE_TTL);
    res.json({ success: true, cached: false, data: payload });
  } catch (err) {
    console.error("getSettings error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load settings",
      error: err.message,
    });
  }
};

exports.updateTheme = async (req, res) => {
  try {
    const { preset, mode, customPrimary } = req.body || {};

    if (preset && !VALID_PRESETS.has(preset)) {
      return res.status(400).json({
        success: false,
        message: `Invalid preset. Must be one of: ${[...VALID_PRESETS].join(", ")}`,
      });
    }

    if (
      preset === "custom" &&
      (!customPrimary || !HEX_RE.test(customPrimary))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customPrimary must be a valid hex color (e.g. #7c3aed) when preset is 'custom'",
      });
    }

    if (mode && mode !== "dark") {
      return res.status(400).json({
        success: false,
        message:
          "mode must be 'dark' (light mode is reserved for a future release)",
      });
    }

    const doc = await findOrCreate();
    if (preset) doc.theme.preset = preset;
    if (mode) doc.theme.mode = mode;
    if (preset === "custom") {
      doc.theme.customPrimary = customPrimary;
    } else if (preset && preset !== "custom") {
      // Clear stale custom value when switching back to a preset
      doc.theme.customPrimary = null;
    }
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    await cacheService.del(CACHE_KEY);

    res.json({
      success: true,
      message: "Theme updated",
      data: {
        theme: {
          preset: doc.theme.preset,
          mode: doc.theme.mode,
          customPrimary: doc.theme.customPrimary,
        },
      },
    });
  } catch (err) {
    console.error("updateTheme error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update theme",
      error: err.message,
    });
  }
};
