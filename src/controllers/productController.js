const Product = require("../models/Product");
const { paginate, paginationResponse } = require("../utils/helper");
const cacheService = require("../services/cacheService");
const analyticsService = require("../services/analyticsService");
const { validationResult } = require("express-validator");
const notificationService = require("../services/notificationService");

// Escape user input so it's safe inside a RegExp (avoid ReDoS / regex injection)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = (q) => {
  if (!q || !q.trim()) return null;
  const tokens = q.trim().split(/\s+/).filter(Boolean).slice(0, 8);
  return {
    $and: tokens.map((token) => {
      const rx = new RegExp(escapeRegex(token), "i");
      return {
        $or: [
          { name: rx },
          { description: rx },
          { category: rx },
          { tags: rx },
        ],
      };
    }),
  };
};

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
      q,
    } = req.query;

    const skipCache = Boolean(q && q.trim());
    const cacheKey = `list:${JSON.stringify(req.query)}`;
    if (!skipCache) {
      const cachedData = await cacheService.getCachedProductList(cacheKey);
      if (cachedData) {
        return res.json({ success: true, cached: true, ...cachedData });
      }
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

    // global search across all products
    const searchFilter = buildSearchFilter(q);
    if (searchFilter) Object.assign(query, searchFilter);

    const { skip, limit: limitNum } = paginate(page, limit);

    const [products, total] = await Promise.all([
      Product.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(query),
    ]);

    // When searching, boost exact name matches to the top of the page
    let ranked = products;
    if (q && q.trim()) {
      const fullRx = new RegExp(escapeRegex(q.trim()), "i");
      ranked = [
        ...products.filter((p) => fullRx.test(p.name || "")),
        ...products.filter((p) => !fullRx.test(p.name || "")),
      ];
    }

    const response = paginationResponse(
      ranked,
      total,
      parseInt(page),
      limitNum,
    );

    if (!skipCache) {
      await cacheService.cacheProductList(cacheKey, response, 300);
    }

    res.json({
      success: true,
      cached: false,
      query: q || undefined,
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

    if (!q || !q.trim()) {
      return res.json({
        success: true,
        query: "",
        data: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0,
      });
    }

    const cleaned = q.trim();
    const { skip, limit: limitNum } = paginate(page, limit);
    const query = buildSearchFilter(cleaned) || {};
    const fullRx = new RegExp(escapeRegex(cleaned), "i");

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ purchaseCount: -1, viewCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    const ranked = [
      ...products.filter((p) => fullRx.test(p.name || "")),
      ...products.filter((p) => !fullRx.test(p.name || "")),
    ];

    res.locals.resultCount = total;

    const response = paginationResponse(
      ranked,
      total,
      parseInt(page),
      limitNum,
    );

    res.json({ success: true, query: cleaned, ...response });
  } catch (err) {
    console.error("Search products error:", err);
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

// getNewArrivals — last N in-stock products sorted by createdAt
const getNewArrivals = async (req, res) => {
  try {
    const { limit = 12 } = req.query;

    let products = await cacheService.getCachedNewArrivals();
    if (!products) {
      products = await Product.find({ stock: { $gt: 0 } })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();
      await cacheService.cacheNewArrivals(products);
    } else if (products.length > parseInt(limit)) {
      products = products.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: products,
    });
  } catch (err) {
    console.error("New arrivals error:", err);
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

    const sortedProducts = productIds
      .map((id) => products.find((p) => p._id.toString() === id))
      .filter(Boolean);
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

// deleteProduct
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await cacheService.invalidateProduct(req.params.id);
    await cacheService.delPattern("products:*");
    await cacheService.del("flash:products");
    await cacheService.del("trending:products");

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
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

// deactivate flash sale
const deactivateFlashSale = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.flashSale?.isActive) {
      return res.status(400).json({
        success: false,
        message: "No active flash sale on this product",
      });
    }

    product.flashSale.isActive = false;
    product.discountPrice = undefined;
    await product.save();

    await cacheService.invalidateProduct(req.params.id);
    await cacheService.del("flash:products");

    res.json({
      success: true,
      message: "Flash sale deactivated",
      data: product,
    });
  } catch (error) {
    console.error("Deactivate flash sale error:", error);
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
  getNewArrivals,
  getProductById,
  getRecentlyViewed,
  createProduct,
  updateProduct,
  deleteProduct,
  createFlashSale,
  deactivateFlashSale,
};
