const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: 'user'
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
    },
    sessions: [
      {
        token: String,
        deviceInfo: String,
        ip: String,
        createdAt: { type: Date, default: Date.now },
        lastActivity: { type: Date, default: Date.now },
      },
    ],
    recentlyViewed: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    searchHistory: [
      {
        query: String,
        searchedAt: { type: Date, default: Date.now },
      },
    ],
    activityScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// hash password before db save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  // next();
});

// password compare
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// session clean
userSchema.methods.cleanupSessions = function () {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  this.sessions = this.sessions.filter(
    (session) => session.lastActivity > thirtyDaysAgo,
  );
};

module.exports = mongoose.model("User", userSchema);
