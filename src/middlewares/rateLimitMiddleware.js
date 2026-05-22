const cacheService = require("../services/cacheService");

const isDev = process.env.NODE_ENV !== "production";

// Custom rate limiter using Redis
exports.rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests. Please try again in a moment.",
    keyGenerator = (req) => req.ip,
    skip = () => false,
  } = options;

  return async (req, res, next) => {
    try {
      if (skip(req)) return next();

      const key = keyGenerator(req);
      const windowSeconds = Math.floor(windowMs / 1000);
      const requestCount = await cacheService.incrementRateLimit(
        key,
        windowSeconds,
      );

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - requestCount));
      res.setHeader("X-RateLimit-Reset", Date.now() + windowMs);

      if (requestCount > max) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (err) {
      console.error("Rate limiter error:", err);
      next();
    }
  };
};

const GLOBAL_SKIP_PATHS = new Set(["/api/auth/me", "/api/settings", "/health"]);
exports.apiLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 1500,
  message: "Too many requests. Please try again in a few minutes.",
  skip: (req) => GLOBAL_SKIP_PATHS.has(req.path),
});

exports.authLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 25,
  message: "Too many authentication attempts. Please wait a few minutes.",
  keyGenerator: (req) => (req.body && req.body.email) || req.ip,
});

exports.otpLimiter = exports.rateLimiter({
  windowMs: 60 * 1000,
  max: isDev ? 20 : 8,
  message: "Too many OTP requests. Please wait a minute.",
  keyGenerator: (req) => (req.body && req.body.email) || req.ip,
});

exports.searchLimiter = exports.rateLimiter({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 300,
  message: "Slow down a moment — too many searches.",
});
