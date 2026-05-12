const cacheService = require("../services/cacheService");

// Custom rate limiter using Redis
exports.rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = "Too many requests, Please try again later",
    keyGenerator = (req) => req.ip,
  } = options;

  return async (req, res, next) => {
    try {
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

// rate limiters for different endpoints
exports.authLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later",
  keyGenerator: (req) => req.body.email || req.ip,
});

exports.otpLimiter = exports.rateLimiter({
  windowMs: 60 * 1000,
  max: 3,
  message: 'Too many OTP requests, please try again later',
  keyGenerator: (req) => req.body.email || req.ip
});

exports.apiLimiter = exports.rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});

exports.searchLimiter = exports.rateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many search requests, please slow down'
});





// const redis = require("../configs/redis");

// const rateLimit = async (req, res, next) => {
//   const ip = req.ip;
//   const request = await redis.incr(`rate:${ip}`);

//   if (request === 1) {
//     await redis.expire(`rate:${ip}`, 60);
//   }

//   if (request > 100) {
//     return res.status(429).json({
//       message: "too many requests",
//     });
//   }

//   next();
// };

// module.exports = rateLimit;
