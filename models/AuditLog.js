const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
  action: {
    type: String,
    required: true,
    enum: [
      'CHANNEL_CREATED',
      'CHANNEL_DELETED',
      'CHANNEL_UPDATED',
      'MEMBER_JOINED',
      'MEMBER_KICKED',
      'MESSAGE_EDITED',
      'MESSAGE_DELETED',
      'WEBHOOK_CREATED',
      'WEBHOOK_DELETED',
      'USER_CREATED',
      'USER_DELETED',
      'ROLE_CHANGED'
    ],
    index: true
  },
  targetType: { type: String, required: true, trim: true },
  targetId: { type: String, required: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Production Keyset / Cursor Pagination B-Tree Indexes
auditLogSchema.index({ timestamp: -1, _id: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
