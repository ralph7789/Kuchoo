const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  topic: { type: String, default: '' },
  description: { type: String, default: '' },
  isPrivate: { type: Boolean, default: false, index: true },
  isPublic: { type: Boolean, default: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  allowedRoles: [{ type: String, default: ['*'] }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Production Compound B-Tree Indexes
groupSchema.index({ name: 1 });
groupSchema.index({ isPrivate: 1, members: 1 });

module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);

