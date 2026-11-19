
const express = require("express");
const Offer = require("../models/Offer");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function validLink(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// PUBLIC: active offers
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    const offers = await Offer.find({
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] }
      ]
    }).sort({ createdAt: -1 });

    res.json({ success: true, offers });
  } catch (error) {
    console.error("Public offers error:", error.message);
    res.status(500).json({ success: false, message: "Unable to load offers" });
  }
});

// All management routes below require admin authentication.
router.use(requireAuth, requireAdmin);

// ADMIN: all offers
router.get("/all", async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to load offers" });
  }
});

// ADMIN: create offer
router.post("/", async (req, res) => {
  try {
    const { title, description, badge, link, isActive, startDate, endDate } = req.body;

    if (typeof title !== "string" || !title.trim() || title.length > 150) {
      return res.status(400).json({ success: false, message: "Valid title required" });
    }

    if (link !== undefined && (typeof link !== "string" || !validLink(link))) {
      return res.status(400).json({ success: false, message: "Invalid offer link" });
    }

    const offer = await Offer.create({
      title: title.trim(),
      description,
      badge,
      link,
      isActive: isActive !== false,
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, offer });
  } catch (error) {
    console.error("Create offer error:", error.message);
    res.status(500).json({ success: false, message: "Unable to create offer" });
  }
});

// ADMIN: update offer
router.patch("/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid offer ID" });
    }

    const allowed = ["title", "description", "badge", "link", "isActive", "startDate", "endDate"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.title !== undefined &&
        (typeof updates.title !== "string" || !updates.title.trim() || updates.title.length > 150)) {
      return res.status(400).json({ success: false, message: "Invalid title" });
    }

    if (updates.link !== undefined &&
        (typeof updates.link !== "string" || !validLink(updates.link))) {
      return res.status(400).json({ success: false, message: "Invalid offer link" });
    }

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to update offer" });
  }
});

// ADMIN: delete offer
router.delete("/:id", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid offer ID" });
    }

    const offer = await Offer.findByIdAndDelete(req.params.id);

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to delete offer" });
  }
});

module.exports = router;
