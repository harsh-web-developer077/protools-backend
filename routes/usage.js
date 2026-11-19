
const express = require("express");
const mongoose = require("mongoose");
const ToolUsage = require("../models/ToolUsage");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const validSlug = /^[a-z0-9-]{1,120}$/;

router.post("/", async (req, res) => {
  try {
    const {
      toolSlug,
      toolName,
      sessionId,
      eventType,
      status
    } = req.body;

    if (
      typeof toolSlug !== "string" ||
      !validSlug.test(toolSlug) ||
      typeof toolName !== "string" ||
      !toolName.trim() ||
      toolName.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid tool information"
      });
    }

    const allowedEvents = ["page_view", "tool_action"];
    const allowedStatuses = ["success", "failed", "started"];

    if (
      !allowedEvents.includes(eventType) ||
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid event information"
      });
    }

    let userId = null;

    // Optional authentication: identify user if valid token exists.
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const jwt = require("jsonwebtoken");
        const User = require("../models/User");

        const decoded = jwt.verify(
          authHeader.split(" ")[1],
          process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id)
          .select("_id isActive");

        if (user && user.isActive) {
          userId = user._id;
        }
      } catch {
        // Invalid/expired token is treated as guest.
      }
    }

    let cleanSessionId = null;

    if (!userId && typeof sessionId === "string") {
      cleanSessionId = sessionId
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 100);
    }

    if (!userId && !cleanSessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID required for guest tracking"
      });
    }

    await ToolUsage.create({
      toolSlug,
      toolName: toolName.trim(),
      user: userId,
      sessionId: cleanSessionId,
      eventType,
      status
    });

    res.status(201).json({
      success: true,
      message: "Tool activity recorded"
    });

  } catch (error) {
    console.error("Usage tracking error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to record tool activity"
    });
  }
});

module.exports = router;
