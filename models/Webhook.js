const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  name: { type: String, required: true, trim: true },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(24).toString('hex')
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Production Compound B-Tree Index
webhookSchema.index({ token: 1, isActive: 1 });

module.exports = mongoose.models.Webhook || mongoose.model('Webhook', webhookSchema);
