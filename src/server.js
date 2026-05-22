require("dotenv").config();
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const express = require("express");
const socketIO = require("socket.io");
const compression = require("compression");
const { redis } = require("./configs/redis");
const connectDB = require("./configs/database");

const { apiLimiter } = require("./middlewares/rateLimitMiddleware");
const notificationService = require("./services/notificationService");
const { trackRequest } = require("./middlewares/analyticsMiddleware");

const authRoutes = require("./routes/authRoute");
const productRoutes = require("./routes/productRoute");
const orderRoutes = require("./routes/orderRoute");
const bannerRoutes = require("./routes/bannerRoute");
const settingsRoutes = require("./routes/settingsRoute");

// Initialize workers
require("./workers/emailWorker");
require("./workers/orderWorker");
require("./workers/cartExpiryWorker");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

notificationService.initialize(io);

// Production-grade CORS configuration with credentials
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.ADMIN_URL,
      "http://localhost:3000",
      "http://localhost:5173",
    ].filter(Boolean);

    // Allow requests from allowed origins or no origin (mobile apps, curl, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400, // 24 hours
};

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
);

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET || "default-secret"));

// Global rate limiting
app.use(apiLimiter);

// Analytics tracking
app.use(trackRequest);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/banner", bannerRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

connectDB();

app.listen(PORT, (err) => {
  if (err) throw new Error("Error while connectiong with Server");
  else {
    console.log(`🚀 Server is live at Port: ${PORT}
🔌 WebSocket: ws://localhost:${PORT}`);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
