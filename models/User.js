const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for SSO users
  displayName: { type: String, required: true },
  xidId: { type: String, sparse: true, unique: true },
  avatarUrl: { type: String },
  roles: { type: [String], default: ['user'] },
  isAdmin: { type: Boolean, default: false },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

