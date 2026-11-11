import React from 'react';
import MessageBubble from './MessageBubble';
import { MessageSquare } from '../common/Icons';

export default function MessageTimeline({
  messages = [],
  currentUserId,
  allUsers = [],
  messagesEndRef,
  activeTarget
}) {
  if (messages.length === 0) {
    return (
      <div className="message-timeline" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0, 240, 255, 0.1)', color: '#00F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto' }}>
            <MessageSquare size={24} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', marginBottom: 6 }}>
            No messages yet
          </h3>
          <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
            Send a message below to start collaborating, or type <code style={{ color: '#8B5CF6' }}>@aladin</code> to query the autonomous copilot.
          </p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="message-timeline">
      <div className="date-divider">
        <span className="date-divider-pill">Conversation Stream</span>
      </div>

      {messages.map((msg, idx) => {
        const isSelf = msg.from === currentUserId;
        const senderUser = allUsers.find(u => u._id === msg.from);
        return (
          <MessageBubble
            key={msg._id || idx}
            message={msg}
            isSelf={isSelf}
            senderUser={senderUser}
          />
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}
