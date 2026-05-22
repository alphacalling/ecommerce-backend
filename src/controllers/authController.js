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

const serializeUser = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

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

    const isBootstrapAdmin =
      process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    user = await User.create({
      email,
      password,
      name,
      role: isBootstrapAdmin ? "admin" : "user",
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

    if (
      process.env.ADMIN_EMAIL &&
      user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() &&
      user.role !== "admin"
    ) {
      user.role = "admin";
      console.log(`Bootstrap admin promoted: ${user.email}`);
    }

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

    // Set secure HTTP-only cookie
    const tokenExpiry = parseInt(process.env.JWT_EXPIRY || 7 * 24 * 60 * 60);
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: tokenExpiry * 1000,
      path: "/",
      signed: true,
    });

    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: serializeUser(user),
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

    if (
      process.env.ADMIN_EMAIL &&
      user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() &&
      user.role !== "admin"
    ) {
      user.role = "admin";
      await user.save();
      console.log(`Bootstrap admin promoted: ${user.email}`);
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

    // Set secure HTTP-only cookie
    const tokenExpiry = parseInt(process.env.JWT_EXPIRY || 7 * 24 * 60 * 60); // Default 7 days
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: tokenExpiry * 1000, // Convert to milliseconds
      path: "/",
      signed: true,
    });

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: serializeUser(user),
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

    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

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
        user: serializeUser(req.user),
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

// admin: list all users (paginated)
const listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (role && ["user", "admin"].includes(role)) query.role = role;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -otp -sessions")
        .sort("-createdAt")
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// admin: update a user's role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user' or 'admin'.",
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true },
    ).select("-password -otp -sessions");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const genericResponse = {
      success: true,
      message:
        "If an account exists for that email, a reset code has been sent.",
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.json(genericResponse);
    }

    const code = generateOTP();
    const ttlSeconds = parseInt(process.env.OTP_EXPIRY) || 600;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    user.passwordReset = { code, expiresAt };
    await user.save();

    await cacheService.storeResetCode(email, code, ttlSeconds);
    await queueService.sendPasswordResetEmail(email, code, user.name);

    return res.json(genericResponse);
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, code, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    const cachedCode = await cacheService.getResetCode(email);
    const persistedValid =
      user.passwordReset?.code === code &&
      user.passwordReset?.expiresAt instanceof Date &&
      user.passwordReset.expiresAt > new Date();

    const isValid = cachedCode === code || persistedValid;
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    user.password = password;
    user.passwordReset = undefined;
    user.sessions = [];
    await user.save();

    await cacheService.deleteResetCode(email);

    res.clearCookie("authToken", { path: "/" });

    res.json({
      success: true,
      message:
        "Password reset successful. Please log in with your new password.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.sessions = user.sessions.filter((s) => s.token === req.token);
    await user.save();

    res.json({
      success: true,
      message:
        "Password changed successfully. Other devices have been signed out.",
    });
  } catch (err) {
    console.error("changePassword error:", err);
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
  listUsers,
  updateUserRole,
  forgotPassword,
  resetPassword,
  changePassword,
};
