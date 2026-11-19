
const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    badge: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "SPECIAL OFFER"
    },

    link: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    startDate: {
      type: Date,
      default: null
    },

    endDate: {
      type: Date,
      default: null
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Offer", offerSchema);
