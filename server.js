
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 5000;

// Render proxy support
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security middleware
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server and local development requests
    if (!origin || allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ProTools Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ProTools API is healthy",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

// Start server only after MongoDB connects
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in .env file");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`ProTools Backend running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
