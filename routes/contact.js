
const express = require("express");
const Contact = require("../models/Contact");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// PUBLIC: submit contact message
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid contact details"
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMessage = message.trim();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanMessage.length < 5 ||
      cleanMessage.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: "Please check your contact form details"
      });
    }

    const contact = await Contact.create({
      name: cleanName,
      email: cleanEmail,
      subject: typeof subject === "string"
        ? subject.trim().slice(0, 150)
        : "General Enquiry",
      message: cleanMessage
    });

    res.status(201).json({
      success: true,
      message: "Your message has been submitted",
      id: contact._id
    });

  } catch (error) {
    console.error("Contact submission error:", error.message);
    res.status(500).json({
      success: false,
      message: "Unable to submit your message"
    });
  }
});

// ADMIN: protect all routes below
router.use(requireAuth, requireAdmin);

// View contact messages
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const [messages, total] = await Promise.all([
      Contact.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Contact.countDocuments()
    ]);

    res.json({
      success: true,
      messages,
      pagination: { page, limit, total }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to load contact messages"
    });
  }
});

// ADMIN: update message status
router.patch("/:id/status", async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message ID"
      });
    }

    const { status } = req.body;

    if (!["new", "read", "replied"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid message status"
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    res.json({ success: true, contact });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update message"
    });
  }
});

module.exports = router;
