const express = require("express");
const User = require("../models/User");
const { generateToken } = require("../utils/jwt");
const { generateOTP } = require("../utils/helper");
const cacheService = require("../services/cacheService");
const { queueService } = require("../services/queueService");
const emailService = require("../services/emailService");
const { body, validationResult } = require("express-validator");
const {
  authLimiter,
  otpLimiter,
} = require("../middlewares/rateLimitMiddleware");
const { protect, optionalAuth } = require("../middlewares/authMiddleware");

// register users
const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { email, password, name } = req.body;
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRY) * 1000,
    );

    user = await User.create({
      email,
      password,
      name,
      otp: {
        code: otp,
        expiresAt: otpExpiry,
      },
    });
    // storing in redis
    await cacheService.storeOTP(email, otp, parseInt(process.env.OTP_EXPIRY));
    await queueService.sendOTPEmail(email, otp, name);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for OTP",
      data: {
        email: user.email,
        name: user.name,
        otpExpiresIn: process.env.OTP_EXPIRY,
      },
    });
  } catch (err) {
    console.error("Registration error: ", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// verify otp
const verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { email, otp } = req.body;
    const cachedOtp = await cacheService.getOTP(email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const isValidOTP =
      cachedOtp === otp ||
      (user.otp.code === otp && user.otp.expiresAt > new Date());
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    await cacheService.deleteOTP(email);
    const token = generateToken(user._id);

    // new session
    const sessionData = {
      token,
      deviceInfo: req.headers["user-agent"],
      ip: req.ip,
    };
    user.sessions.push(sessionData);
    await user.save();

    await queueService.sendWelcomeEmail(email, user.name);
    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
        },
        token,
      },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// resend otp
const resendOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRY) * 1000,
    );

    // update user
    user.otp = {
      code: otp,
      expiresAt: otpExpiry,
    };
    await user.save();
    await cacheService.storeOTP(email, otp, parseInt(process.env.OTP_EXPIRY));

    await queueService.sendOTPEmail(email, otp, user.name);
    res.json({
      success: true,
      message: "OTP sent successfully",
      data: {
        otpExpiresIn: process.env.OTP_EXPIRY,
      },
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// login user
const loginUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    // check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
        requiresVerification: true,
      });
    }

    const token = generateToken(user._id);

    // create session
    const sessionData = {
      token,
      deviceInfo: req.headers["user-agent"],
      ip: req.ip,
    };
    user.sessions.push(sessionData);
    user.cleanupSessions();
    await user.save();

    // find t=in Redis
    await cacheService.trackUserSession(user._id.toString(), {
      lastLogin: Date.now(),
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    console.error("failed to login Error: ", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// logout
const logoutUser = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { sessions: { token: req.token } } },
    );
    res.json({
      success: true,
      message: "Logout Successfully",
    });
  } catch (err) {
    console.error("Logout error: ", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// me
const me = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// getSession
const getSession = async (req, res) => {
  try {
    const user = await User.findOne(req.user._id);
    const sessions = user.sessions.map((session) => ({
      deviceInfo: session.deviceInfo,
      ip: session.ip,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrent: session.token === req.token,
    }));

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (err) {
    console.error("failed to get session:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// deleteSession
const deleteSession = async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { sessions: [{ token: req.token }] } },
    );
    res.json({
      success: true,
      message: "Logged out from all other devices",
    });
  } catch (err) {
    console.error("failed to delete session:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  me,
  verifyOtp,
  resendOtp,
  loginUser,
  logoutUser,
  getSession,
  registerUser,
  deleteSession,
};
