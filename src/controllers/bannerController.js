const Banner = require("../models/Banner");
const cacheService = require("../services/cacheService");
const { validationResult } = require("express-validator");

const CACHE_KEY = "banners:active";

const getActiveBanners = async (req, res) => {
  try {
    const cached = await cacheService.get(CACHE_KEY);
    if (cached) {
      return res.json({ success: true, cached: true, data: cached });
    }

    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    await cacheService.set(CACHE_KEY, banners, 300);

    res.json({ success: true, cached: false, data: banners });
  } catch (err) {
    console.error("Get banners error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// admin: list all banners (active + inactive)
const listAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: banners });
  } catch (err) {
    console.error("List banners error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// admin: create
const createBanner = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const banner = await Banner.create(req.body);
    await cacheService.del(CACHE_KEY);
    res.status(201).json({ success: true, data: banner });
  } catch (err) {
    console.error("Create banner error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// admin: update
const updateBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }
    await cacheService.del(CACHE_KEY);
    res.json({ success: true, data: banner });
  } catch (err) {
    console.error("Update banner error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// admin: delete
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) {
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });
    }
    await cacheService.del(CACHE_KEY);
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    console.error("Delete banner error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  getActiveBanners,
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
