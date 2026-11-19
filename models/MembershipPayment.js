const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  plan: { type: String, enum: ["monthly", "yearly"], required: true },
  amount: { type: Number, enum: [199, 999], required: true },
  utr: { type: String, required: true, trim: true, minlength: 8, maxlength: 30 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });

paymentSchema.index({ utr: 1 }, { unique: true });

module.exports = mongoose.model("MembershipPayment", paymentSchema);
