const Product = require("../models/Product");
const { paginate, paginationResponse } = require("../utils/helper");
const cacheService = require("../services/cacheService");
const analyticsService = require("../services/analyticsService");
const { validationResult } = require("express-validator");
const notificationService = require("../services/notificationService");

// getproducts
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      minPrice,
      maxPrice,
      sort = "-createdAt",
      flashSale,
    } = req.query;

    const cacheKey = `list:${JSON.stringify(req.query)}`;
    const cachedData = await cacheService.getCachedProductList(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        cached: true,
        ...cachedData,
      });
    }

    const query = {};

    if (category) query.category = category;

    if (flashSale === "true") {
      query["flashSale.isActive"] = true;
      query["flashSale.endTime"] = { $gt: new Date() };
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const { skip, limit: limitNum } = paginate(page, limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query),
    ]);

    const response = paginationResponse(
      products,
      total,
      parseInt(page),
      limitNum,
    );

    await cacheService.cacheProductList(cacheKey, response, 300);

    res.json({
      success: true,
      cached: false,
      ...response,
    });
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// product search
const getProductSearch = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query msut be at least 2 characters",
      });
    }

    const { skip, limit: limitNum } = paginate(page, limit);

    // text search
    const [products, total] = await Promise.all([
      Product.find({ $text: { $search: q } }, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments({ $text: { $search: q } }),
    ]);
    res.locals.resultCount = total;

    const response = paginationResponse(
      products,
      total,
      parseInt(page),
      limitNum,
    );

    res.json({
      success: true,
      query: q,
      ...response,
    });
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// trending products
const getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    let cachedTrending = await cacheService.getCachedTrendingProducts();

    if (!cachedTrending) {
      const trendingData = await analyticsService.calculateTrendingProducts();
      const productIds = trendingData
        .slice(0, parseInt(limit))
        .map((t) => t.productId);

      cachedTrending = await Product.find({ _id: { $in: productIds } }).lean();
      // for 5 min
      await cacheService.cacheTrendingProducts(cachedTrending);
    }
    res.json({
      success: true,
      data: cachedTrending,
    });
  } catch (err) {
    console.error("Trending Products Error: ", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// getFlash sale
const getFlashSale = async (req, res) => {
  try {
    let flashSaleProducts = await cacheService.getCachedFlashSaleProducts();
    if (!flashSaleProducts) {
      flashSaleProducts = await Product.find({
        "flashSale.isActive": true,
        "flashSale.endTime": { $gt: new Date() },
        "flashSale.startTime": { $lte: new Date() },
      })
        .sort("-flashSale.discountPercentage")
        .lean();
    }
    await cacheService.cacheFlashSaleProducts(flashSaleProducts);
    // Cache for 1 minute
    await cacheService.cacheFlashSaleProducts(flashSaleProducts);
    res.json({
      success: true,
      data: flashSaleProducts,
    });
  } catch (err) {
    console.error("Flash Sale Error: ", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// getProduct by Id
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    let product = await cacheService.getCachedProduct(id);

    if (!product) {
      product = await Product.findById(id).lean();

      if (product) {
        await cacheService.cacheProduct(id, product);
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).exec();

    if (req.user) {
      await cacheService.addRecentlyViewed(req.user._id.toString(), id);
    }
    res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// getRecentlyViewed
const getRecentlyViewed = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const productIds = await cacheService.getRecentlyViewed(
      req.user._id.toString(),
      parseInt(limit),
    );
    if (productIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    const sortedProducts = productIds.map((id) =>
      products.find((p) => p._id.toString() === id).filter(Boolean),
    );
    res.json({
      success: true,
      data: sortedProducts,
    });
  } catch (error) {
    console.error("Get recently viewed error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// createProduct
const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const product = await Product.create(req.body);

    // invalid cache
    await cacheService.delPattern("products:*");
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Create product error::", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// updateProduct
const updateProduct = async (req, res) => {
  try {
    const products = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!products) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    await cacheService.invalidateProduct(req.params.id);
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// flash Sale
const createFlashSale = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { startTime, endTime, discountPercentage, maxQuantity } = req.body;
    console.error("req.body: ", req.body);
    console.error("req.params.id..", req.params.id);

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.flashSale = {
      isActive: true,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      discountPercentage,
      maxQuantity: maxQuantity || product.stock,
      soldCount: 0,
    };

    product.discountPrice = product.price * (1 - discountPercentage / 100);

    await product.save();

    await cacheService.invalidateProduct(req.params.id);
    await cacheService.del("flash:products");

    await notificationService.notifyFlashSale({
      id: product._id,
      name: product.name,
      discountPercentage,
      discountPrice: product.discountPrice,
    });

    res.json({
      success: true,
      message: "Flash sale activated",
      data: product,
    });
  } catch (error) {
    console.error("Set flash sale error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  getProductSearch,
  getTrendingProducts,
  getFlashSale,
  getProductById,
  getRecentlyViewed,
  createProduct,
  updateProduct,
  createFlashSale,
};
