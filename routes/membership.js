const express = require("express");
const MembershipPayment = require("../models/MembershipPayment");
const User = require("../models/User");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const plans = { monthly: { amount: 199, days: 30 }, yearly: { amount: 999, days: 365 } };

router.post("/payments", requireAuth, async (req, res) => {
  try {
    const { plan, utr } = req.body || {};
    if (!plans[plan] || typeof utr !== "string" || !/^[A-Za-z0-9-]{8,30}$/.test(utr.trim())) {
      return res.status(400).json({ success: false, message: "Select a valid plan and enter a valid UTR/reference number (8-30 characters)." });
    }
    const cleanUtr = utr.trim().toUpperCase();
    const exists = await MembershipPayment.findOne({ utr: cleanUtr });
    if (exists) return res.status(409).json({ success: false, message: "This UTR has already been submitted." });
    const payment = await MembershipPayment.create({ user: req.user._id, plan, amount: plans[plan].amount, utr: cleanUtr });
    return res.status(201).json({ success: true, message: "Payment request submitted for administrator verification.", paymentId: payment._id, status: payment.status });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "This UTR has already been submitted." });
    console.error("Membership payment submit:", error.message);
    return res.status(500).json({ success: false, message: "Could not submit payment request." });
  }
});

router.get("/payments/mine", requireAuth, async (req, res) => {
  const payments = await MembershipPayment.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, payments });
});

router.get("/admin/payments", requireAuth, requireAdmin, async (req, res) => {
  const payments = await MembershipPayment.find().populate("user", "name email").sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, payments: payments.map(p => ({ ...p, userEmail: p.user?.email || "", userName: p.user?.name || "" })) });
});

router.post("/admin/payments/:id/:action", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ success: false, message: "Invalid review action." });
    const payment = await MembershipPayment.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: action === "approve" ? "approved" : "rejected", reviewedBy: req.user._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: "Pending payment request not found." });
    if (action === "approve") {
      const days = plans[payment.plan].days;
      const user = await User.findById(payment.user);
      if (!user) {
        await MembershipPayment.updateOne({ _id: payment._id }, { $set: { status: "pending", reviewedBy: null, reviewedAt: null } });
        return res.status(404).json({ success: false, message: "Payment user account not found." });
      }
      const now = new Date();
      const activeExpiry = user.membershipExpiresAt && user.membershipExpiresAt > now ? user.membershipExpiresAt : now;
      user.membershipPlan = payment.plan;
      user.membershipStartedAt = user.membershipStartedAt && user.membershipExpiresAt > now ? user.membershipStartedAt : now;
      user.membershipExpiresAt = new Date(activeExpiry.getTime() + days * 86400000);
      await user.save();
    }
    return res.json({ success: true, message: action === "approve" ? "Payment approved and Pro membership activated." : "Payment request rejected." });
  } catch (error) {
    console.error("Membership review:", error.message);
    return res.status(500).json({ success: false, message: "Could not review payment request." });
  }
});

module.exports = router;
