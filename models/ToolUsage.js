
const mongoose = require("mongoose");

const toolUsageSchema = new mongoose.Schema(
  {
    toolSlug: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true
    },

    toolName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    sessionId: {
      type: String,
      default: null,
      maxlength: 100,
      index: true
    },

    eventType: {
      type: String,
      enum: ["page_view", "tool_action"],
      default: "page_view"
    },

    status: {
      type: String,
      enum: ["success", "failed", "started"],
      default: "started"
    },

    usedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Automatically remove analytics older than 1 year
toolUsageSchema.index(
  { usedAt: 1 },
  { expireAfterSeconds: 31536000 }
);

module.exports = mongoose.model("ToolUsage", toolUsageSchema);
