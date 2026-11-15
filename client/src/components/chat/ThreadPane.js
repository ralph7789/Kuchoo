import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, MessageCircle, Sparkles } from '../common/Icons';
import MarkdownContent from './MarkdownContent';
import VoicePlayer from './VoicePlayer';

export default function ThreadPane({
  parentMessage,
  onClose,
  currentUserId,
  allUsers = [],
  onSendReply,
  onToggleReaction,
  socket,
  backendUrl = ''
}) {
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const repliesEndRef = useRef(null);

  // Fetch thread replies on mount / parent change
  useEffect(() => {
    if (!parentMessage?._id) return;
    setLoading(true);
    fetch(`${backendUrl}/api/messages/${parentMessage._id}/threads`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.replies)) {
          setReplies(data.replies);
        }
      })
      .catch(err => console.error('Failed to load thread replies:', err))
      .finally(() => setLoading(false));
  }, [parentMessage?._id, backendUrl]);

  // Listen for real-time thread replies via socket
  useEffect(() => {
    if (!socket || !parentMessage?._id) return;

    const handleThreadReply = ({ parentId, reply }) => {
      if (parentId === parentMessage._id) {
        setReplies(prev => {
          if (prev.some(r => r._id === reply._id)) return prev;
          return [...prev, reply];
        });
      }
    };

    socket.on('thread_reply', handleThreadReply);
    return () => {
      socket.off('thread_reply', handleThreadReply);
    };
  }, [socket, parentMessage?._id]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (onSendReply) {
      onSendReply(parentMessage._id, replyText);
    }
    setReplyText('');
  };

  const getSenderName = (userId, isAladin) => {
    if (isAladin) return 'Aladin AI Copilot';
    if (userId === currentUserId) return 'You';
    const u = allUsers.find(user => user._id === userId);
    return u?.displayName || 'Teammate';
  };

  const parentIsAladin = Boolean(parentMessage?.content?.startsWith('🤖 **Aladin AI**') || parentMessage?.from === 'aladin');

  return (
    <aside className="workspace-thread-pane" aria-label="Thread Viewport">
      {/* Thread Header */}
      <div className="thread-pane-header">
        <div className="thread-header-title">
          <MessageCircle size={17} color="#00F0FF" />
          <span>Thread</span>
        </div>
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          title="Close Thread"
        >
          <X size={18} />
        </button>
      </div>

      <div className="thread-pane-scroll">
        {/* Parent Root Message Card */}
        <div className="thread-root-card">
          <div className="message-meta-header">
            <span className="message-sender-name">
              {getSenderName(parentMessage.from, parentIsAladin)}
            </span>
            <span className="message-time">
              {new Date(parentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="thread-root-content">
            <MarkdownContent content={parentMessage.content} />
          </div>

          {parentMessage.voiceUrl && (
            <div style={{ marginTop: 8 }}>
              <VoicePlayer src={parentMessage.voiceUrl} />
            </div>
          )}

          {/* Quick reactions on root message */}
          {parentMessage.reactions && parentMessage.reactions.length > 0 && (
            <div className="msg-reaction-bar" style={{ marginTop: 8 }}>
              {parentMessage.reactions.map((r, i) => {
                const hasReacted = r.users.includes(currentUserId);
                return (
                  <button
                    key={i}
                    type="button"
                    className={`reaction-pill ${hasReacted ? 'active' : ''}`}
                    onClick={() => onToggleReaction(parentMessage._id, r.emoji)}
                  >
                    <span>{r.emoji}</span>
                    <span className="reaction-count">{r.users.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider with replies count */}
        <div className="thread-replies-divider">
          <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
          <div className="thread-divider-line" />
        </div>

        {/* Replies Timeline */}
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            Loading thread replies...
          </div>
        ) : (
          <div className="thread-replies-stream">
            {replies.map((reply) => {
              const isSelf = reply.from === currentUserId;
              const isAladin = Boolean(reply.content?.startsWith('🤖 **Aladin AI**'));
              return (
                <div key={reply._id} className={`thread-reply-row ${isSelf ? 'self' : 'them'}`}>
                  <div className="thread-reply-card">
                    <div className="message-meta-header">
                      <span className="message-sender-name">
                        {getSenderName(reply.from, isAladin)}
                      </span>
                      {isAladin && (
                        <span className="message-ai-badge">
                          <Sparkles size={11} /> AI
                        </span>
                      )}
                      <span className="message-time">
                        {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="message-text">
                      <MarkdownContent content={reply.content} />
                    </div>

                    {reply.voiceUrl && (
                      <div style={{ marginTop: 6 }}>
                        <VoicePlayer src={reply.voiceUrl} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={repliesEndRef} />
          </div>
        )}
      </div>

      {/* Thread Input Dock */}
      <form onSubmit={handleSubmit} className="thread-reply-input-dock">
        <input
          type="text"
          className="thread-input-field"
          placeholder="Reply in thread... (type @aladin for AI assistance)"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
        />
        <button
          type="submit"
          className="send-msg-btn"
          disabled={!replyText.trim()}
          title="Send thread reply"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}
