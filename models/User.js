
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254
  },

  password: {
    type: String,
    required: true,
    select: false
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date,
    default: null
  },

  membershipPlan: {
    type: String,
    enum: ["starter", "monthly", "yearly"],
    default: "starter"
  },

  membershipStartedAt: {
    type: Date,
    default: null
  },

  membershipExpiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.refreshMembership = function () {
  if (
    this.membershipPlan !== "starter" &&
    this.membershipExpiresAt &&
    this.membershipExpiresAt <= new Date()
  ) {
    this.membershipPlan = "starter";
    this.membershipStartedAt = null;
    this.membershipExpiresAt = null;
  }
};

userSchema.methods.hasActivePro = function () {
  this.refreshMembership();
  return this.membershipPlan !== "starter";
};

module.exports = mongoose.model("User", userSchema);
