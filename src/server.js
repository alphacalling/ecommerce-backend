require("dotenv").config();
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const express = require("express");
const socketIO = require("socket.io");
const compression = require("compression");
const { redis } = require("./configs/redis");
const connectDB = require("./configs/database");
const { apiLimiter } = require("./middlewares/rateLimitMiddleware");
const notificationService = require("./services/notificationService");
const { trackRequest } = require("./middlewares/analyticsMiddleware");
const authRoutes = require("./routes/authRoute");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT;
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "",
    methods: ["GET", "POST"],
  },
});

notificationService.initialize(io);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);

// Global rate limiting
app.use(apiLimiter);

// Analytics tracking
app.use(trackRequest);

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
