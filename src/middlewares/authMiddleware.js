const jwt = require("jsonwebtoken");
const userSchema = require("../models/User");
const cacheService = require("../services/cacheService");

// protect 
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
      // updating last acitvity
      await userSchema.updateOne(
        { _id: user._id, session_token: token },
        { $set: { "session.$.lastActivity": new Date() } },
      );
      // tracing session inRedis
      await cacheService.trackUserSession(user._id.toString(), {
        lastActivity: Date.now(),
        ip: req.ip,
      });
      req.user = user;
      req.token = token;
      next();
    } catch (err) {
      next(err);
    }
  } catch (err) {
    next(err);
  }
};

// optionalAuth 
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
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
