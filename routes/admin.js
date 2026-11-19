
const express = require("express");

const User = require("../models/User");
const LoginActivity = require("../models/LoginActivity");
const ToolUsage = require("../models/ToolUsage");

const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Every route in this file requires admin authentication.
router.use(requireAuth, requireAdmin);

function pagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

// OVERVIEW STATISTICS
router.get("/overview", async (req, res) => {
  try {
    const [
      totalUsers,
      totalLogins,
      totalToolUses,
      totalTools,
      recentUsers,
      recentLogins,
      popularTools
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      LoginActivity.countDocuments(),
      ToolUsage.countDocuments(),
      ToolUsage.distinct("toolSlug").then(items => items.length),

      User.find({ role: "user" })
        .select("name email createdAt lastLogin")
        .sort({ createdAt: -1 })
        .limit(5),

      LoginActivity.find()
        .populate("user", "name email")
        .sort({ loggedInAt: -1 })
        .limit(5),

      ToolUsage.aggregate([
        { $group: {
          _id: "$toolSlug",
          name: { $first: "$toolName" },
          uses: { $sum: 1 }
        }},
        { $sort: { uses: -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalLogins,
        totalToolUses,
        totalTools
      },
      recentUsers,
      recentLogins,
      popularTools
    });

  } catch (error) {
    console.error("Admin overview error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load dashboard overview"
    });
  }
});

// REGISTERED USERS
router.get("/users", async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);

    const [users, total] = await Promise.all([
      User.find({ role: "user" })
        .select("name email isActive createdAt lastLogin")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      User.countDocuments({ role: "user" })
    ]);

    res.json({
      success: true,
      users,
      pagination: { page, limit, total }
    });

  } catch (error) {
    console.error("Admin users error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load users"
    });
  }
});

// LOGIN HISTORY
router.get("/logins", async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);

    const [logins, total] = await Promise.all([
      LoginActivity.find()
        .populate("user", "name email")
        .sort({ loggedInAt: -1 })
        .skip(skip)
        .limit(limit),

      LoginActivity.countDocuments()
    ]);

    res.json({
      success: true,
      logins,
      pagination: { page, limit, total }
    });

  } catch (error) {
    console.error("Admin logins error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load login history"
    });
  }
});

// TOOL USAGE HISTORY
router.get("/usage", async (req, res) => {
  try {
    const { page, limit, skip } = pagination(req);

    const [usage, total] = await Promise.all([
      ToolUsage.find()
        .populate("user", "name email")
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limit),

      ToolUsage.countDocuments()
    ]);

    res.json({
      success: true,
      usage,
      pagination: { page, limit, total }
    });

  } catch (error) {
    console.error("Admin usage error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load tool usage"
    });
  }
});

// POPULAR TOOLS ANALYTICS
router.get("/analytics/tools", async (req, res) => {
  try {
    const tools = await ToolUsage.aggregate([
      {
        $group: {
          _id: "$toolSlug",
          name: { $first: "$toolName" },
          totalUses: { $sum: 1 },
          successfulUses: {
            $sum: {
              $cond: [{ $eq: ["$status", "success"] }, 1, 0]
            }
          },
          guestUses: {
            $sum: {
              $cond: [
                { $eq: ["$user", null] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { totalUses: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      success: true,
      tools
    });

  } catch (error) {
    console.error("Admin analytics error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to load tool analytics"
    });
  }
});

module.exports = router;
