
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later."
  }
});

app.use("/api", apiLimiter);

// Authentication routes
const authRoutes = require("./routes/auth");
const usageRoutes = require("./routes/usage");
const adminRoutes = require("./routes/admin");
const offerRoutes = require("./routes/offers");
const contactRoutes = require("./routes/contact");
const membershipRoutes = require("./routes/membership");

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/membership", membershipRoutes);

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

// Error handler
app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  res.status(500).json({
    success: false,
    message: "Something went wrong"
  });
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
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
