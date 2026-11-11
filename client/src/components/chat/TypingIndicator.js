import React from 'react';

export default function TypingIndicator({ typingUsers = [] }) {
  if (typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0]} is typing...`
    : `${typingUsers.join(', ')} are typing...`;

  return (
    <div className="typing-indicator-bar">
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>{text}</span>
    </div>
  );
}
