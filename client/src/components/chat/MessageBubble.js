import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  FileText,
  Download,
  Sparkles,
  Smile,
  Pin,
  Edit3,
  Trash2,
  MessageCircle
} from '../common/Icons';
import VoicePlayer from './VoicePlayer';
import MarkdownContent from './MarkdownContent';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '🎉', '👀', '💯'];

export default function MessageBubble({
  message,
  isSelf,
  senderUser,
  currentUserId,
  isAdmin = false,
  onOpenThread,
  onToggleReaction,
  onPinMessage,
  onEditMessage,
  onDeleteMessage
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.content || '');

  const isAladin = Boolean(
    message.isAladin ||
    (message.content && (message.content.startsWith('🤖 **Aladin AI**') || message.content.startsWith('✨ [Aladin]'))) ||
    message.from === 'aladin'
  );

  const cleanContent = message.content ? message.content.replace(/^✨ \[Aladin\]\s*/, '') : '';

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const initials = isSelf
    ? 'ME'
    : (isAladin ? '✨' : (senderUser?.displayName ? senderUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'));

  const canEdit = isSelf && !message.isDeleted && !isAladin;
  const canDelete = (isSelf || isAdmin) && !message.isDeleted && !isAladin;

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editDraft.trim()) return;
    if (onEditMessage) {
      onEditMessage(message._id, editDraft.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditDraft(message.content || '');
    setIsEditing(false);
  };

  return (
    <div className={`message-bubble-row ${isSelf ? 'self' : 'them'} ${isAladin ? 'ai-response' : ''} ${message.isPinned ? 'pinned-msg-row' : ''}`}>
      {/* Sender Avatar */}
      {!isSelf && (
        <div
          className="message-avatar"
          style={isAladin ? { background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)' } : {}}
        >
          {initials}
        </div>
      )}

      {/* Bubble Container & Hover Dock */}
      <div className="message-card-wrapper">
        {/* Floating Action Bar (Slack/Teams parity) */}
        {!message.isDeleted && (
          <div className="message-action-toolbar">
            {/* Quick emoji reaction buttons */}
            <div className="toolbar-emoji-quick">
              <button
                type="button"
                className="toolbar-btn"
                title="Thumbs up"
                onClick={() => onToggleReaction && onToggleReaction(message._id, '👍')}
              >
                👍
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Heart"
                onClick={() => onToggleReaction && onToggleReaction(message._id, '❤️')}
              >
                ❤️
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Fire"
                onClick={() => onToggleReaction && onToggleReaction(message._id, '🔥')}
              >
                🔥
              </button>
            </div>

            {/* Emoji Picker Popover trigger */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="toolbar-btn"
                title="Add reaction"
                onClick={() => setShowEmojiPicker(prev => !prev)}
              >
                <Smile size={15} />
              </button>

              {showEmojiPicker && (
                <div className="emoji-picker-popover">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className="emoji-picker-item"
                      onClick={() => {
                        if (onToggleReaction) onToggleReaction(message._id, emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply in Thread Button */}
            <button
              type="button"
              className="toolbar-btn"
              title="Reply in thread"
              onClick={() => onOpenThread && onOpenThread(message)}
            >
              <MessageCircle size={15} />
            </button>

            {/* Pin Message Button */}
            <button
              type="button"
              className={`toolbar-btn ${message.isPinned ? 'active-pin' : ''}`}
              title={message.isPinned ? 'Unpin message' : 'Pin message'}
              onClick={() => onPinMessage && onPinMessage(message._id)}
            >
              <Pin size={15} color={message.isPinned ? '#00F0FF' : 'currentColor'} />
            </button>

            {/* Edit Button */}
            {canEdit && (
              <button
                type="button"
                className="toolbar-btn"
                title="Edit message"
                onClick={() => {
                  setEditDraft(message.content || '');
                  setIsEditing(true);
                }}
              >
                <Edit3 size={15} />
              </button>
            )}

            {/* Delete Button */}
            {canDelete && (
              <button
                type="button"
                className="toolbar-btn delete-btn"
                title="Delete message"
                onClick={() => {
                  if (window.confirm('Delete this message?')) {
                    if (onDeleteMessage) onDeleteMessage(message._id);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}

        {/* Bubble Card */}
        <div className={`message-card ${message.isDeleted ? 'deleted-msg' : ''}`}>
          {/* Pinned header badge */}
          {message.isPinned && (
            <div className="message-pinned-banner">
              <Pin size={12} color="#00F0FF" />
              <span>Pinned by {message.pinnedBy || 'a member'}</span>
            </div>
          )}

          {/* Header meta */}
          <div className="message-meta-header">
            <span className="message-sender-name">
              {isSelf ? 'You' : (isAladin ? 'Aladin AI Copilot' : (senderUser?.displayName || 'Teammate'))}
            </span>
            {isAladin && (
              <span className="message-ai-badge">
                <Sparkles size={11} /> AI Copilot
              </span>
            )}
            <span className="message-time">
              {timestamp}
              {message.isEdited && !message.isDeleted && <span className="edited-badge"> (edited)</span>}
            </span>
          </div>

          {/* Inline Edit Form vs Message Body */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="inline-edit-form">
              <textarea
                className="inline-edit-textarea"
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                autoFocus
                rows={2}
              />
              <div className="inline-edit-actions">
                <button type="button" className="btn-secondary" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!editDraft.trim()}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Text Content with Markdown */}
              {message.isDeleted ? (
                <div className="deleted-text-notice">
                  <em>[This message was deleted]</em>
                </div>
              ) : (
                cleanContent && (
                  <div className="message-text">
                    <MarkdownContent content={cleanContent} />
                  </div>
                )
              )}

              {/* Voice Note Player */}
              {!message.isDeleted && message.voiceUrl && (
                <VoicePlayer src={message.voiceUrl} />
              )}

              {/* File Attachment Card */}
              {!message.isDeleted && message.fileUrl && (
                <a
                  href={message.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-attachment-card"
                >
                  <div className="file-icon-box">
                    <FileText size={18} />
                  </div>
                  <div className="file-info-col">
                    <div className="file-name-text">
                      {message.fileUrl.split('/').pop()}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>Click to download attachment</div>
                  </div>
                  <div className="file-action-icon">
                    <Download size={16} />
                  </div>
                </a>
              )}
            </>
          )}

          {/* Emoji Reactions Bar */}
          {!message.isDeleted && message.reactions && message.reactions.length > 0 && (
            <div className="msg-reaction-bar">
              {message.reactions.map((r, i) => {
                const hasReacted = r.users.includes(currentUserId);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`reaction-pill ${hasReacted ? 'active' : ''}`}
                    title={`${r.users.length} ${r.users.length === 1 ? 'person' : 'people'} reacted with ${r.emoji}`}
                    onClick={() => onToggleReaction && onToggleReaction(message._id, r.emoji)}
                  >
                    <span>{r.emoji}</span>
                    <span className="reaction-count">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Thread Summary Pill (Slack/Teams parity) */}
          {!message.isDeleted && (message.replyCount > 0 || message.lastReplyAt) && (
            <div
              className="message-thread-pill"
              onClick={() => onOpenThread && onOpenThread(message)}
              title="View full thread in side panel"
            >
              <MessageCircle size={14} color="#00F0FF" />
              <span>
                {message.replyCount || 1} {message.replyCount === 1 ? 'reply' : 'replies'}
              </span>
              <span className="thread-pill-arrow">→</span>
            </div>
          )}

          {/* Delivery / Read Status Footer */}
          {isSelf && !message.isDeleted && (
            <div className="message-footer">
              <span className="msg-status-tick">
                {message.read ? <CheckCheck size={14} /> : <Check size={13} />}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
