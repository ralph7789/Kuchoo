const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  users: [{ type: String, required: true }] // user IDs or display identifiers
}, { _id: false });

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true }, // groupId or userId
  content: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true },
  read: { type: Boolean, default: false },
  fileUrl: { type: String, default: null },
  voiceUrl: { type: String, default: null },
  group: { type: Boolean, default: false },

  // Threading (Slack/Teams parity)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null, index: true },
  replyCount: { type: Number, default: 0 },
  lastReplyAt: { type: Date, default: null },

  // Emoji Reactions
  reactions: [reactionSchema],

  // Lifecycle & Mutability
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  // Pinning & Bookmarks
  isPinned: { type: Boolean, default: false, index: true },
  pinnedBy: { type: String, default: null },
  pinnedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Production Compound B-Tree Indexes (O(log N) seeks)
messageSchema.index({ to: 1, timestamp: -1 });
messageSchema.index({ to: 1, parentId: 1, timestamp: 1 });
messageSchema.index({ to: 1, isPinned: 1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
