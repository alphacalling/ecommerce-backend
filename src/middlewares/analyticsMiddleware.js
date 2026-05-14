const analyticsService = require("../services/analyticsService");
const { v4: uuidv4 } = require("uuid");

// Track all requests
exports.trackRequest = async (req, res, next) => {
  if (!req.session) {
    req.session = {};
  }

  if (!req.session.id) {
    req.session.id = uuidv4();
  }

  req.analytics = {
    sessionId: req.session.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    timestamp: new Date(),
  };

  next();
};

// Track product views
exports.trackProductView = async (req, res, next) => {
  const productId = req.params.id || req.params.productId;

  if (productId) {
    const data = {
      userId: req.user?._id,
      productId,
      sessionId: req.analytics?.sessionId,
      ip: req.analytics?.ip,
      source: req.query.source || "direct",
    };

    analyticsService.trackPageView(data).catch(console.error);
  }

  next();
};

// Track search
exports.trackSearch = async (req, res, next) => {
  const query = req.query.q || req.query.query || req.body.query;

  if (query) {
    res.on("finish", () => {
      const data = {
        userId: req.user?._id,
        query,
        resultCount: res.locals.resultCount || 0,
        ip: req.analytics?.ip,
        userAgent: req.analytics?.userAgent,
      };

      analyticsService.trackSearch(data).catch(console.error);
    });
  }

  next();
};
