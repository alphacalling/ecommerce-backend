const jwt = require("jsonwebtoken");
const userSchema = require("../models/User");
const cacheService = require("../services/cacheService");

const ACTIVITY_THROTTLE_MS = 60 * 1000;
const lastActivityWrite = new Map();

const shouldWriteActivity = (userId) => {
  const now = Date.now();
  const prev = lastActivityWrite.get(userId) || 0;
  if (now - prev < ACTIVITY_THROTTLE_MS) return false;
  lastActivityWrite.set(userId, now);
  return true;
};

const extractToken = (req) => {
  if (req.signedCookies && req.signedCookies.authToken) {
    return req.signedCookies.authToken;
  }
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

// protect
exports.protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await userSchema.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // checking if token in active session
    const sessionExists = user.sessions.some(
      (session) => session.token === token,
    );

    if (!sessionExists) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid",
      });
    }

    req.user = user;
    req.token = token;
    next();

    if (shouldWriteActivity(user._id.toString())) {
      const now = new Date();
      userSchema
        .updateOne(
          { _id: user._id, "sessions.token": token },
          { $set: { "sessions.$.lastActivity": now } },
        )
        .catch((err) => console.error("Activity update error:", err.message));

      cacheService
        .trackUserSession(user._id.toString(), {
          lastActivity: Date.now(),
          ip: req.ip,
        })
        .catch((err) =>
          console.error("Redis session track error:", err.message),
        );
    }
  } catch (err) {
    next(err);
  }
};

// optionalAuth
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.signedCookies && req.signedCookies.authToken) {
      token = req.signedCookies.authToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userSchema.findById(decoded.id).select("-password");

        if (user) {
          req.user = user;
        }
      } catch (err) {}
    }
    next();
  } catch (err) {
    next(err);
  }
};

// admin only
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only",
    });
  }
};

// verified only
exports.verifiedOnly = (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Please verify your email first",
    });
  }
};
