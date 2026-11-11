import React from 'react';
import { Check, CheckCheck, FileText, Download, Sparkles } from '../common/Icons';
import VoicePlayer from './VoicePlayer';

export default function MessageBubble({
  message,
  isSelf,
  senderUser
}) {
  const isAladin = Boolean(message.isAladin || (message.content && message.content.startsWith('✨ [Aladin]')) || message.from === 'aladin');
  const cleanContent = message.content ? message.content.replace(/^✨ \[Aladin\]\s*/, '') : '';

  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const initials = isSelf
    ? 'ME'
    : (isAladin ? '✨' : (senderUser?.displayName ? senderUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'));

  return (
    <div className={`message-bubble-row ${isSelf ? 'self' : 'them'} ${isAladin ? 'ai-response' : ''}`}>
      {/* Avatar */}
      {!isSelf && (
        <div
          className="message-avatar"
          style={isAladin ? { background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)', boxShadow: '0 0 12px rgba(139, 92, 246, 0.4)' } : {}}
        >
          {initials}
        </div>
      )}

      {/* Bubble Card */}
      <div className="message-card">
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
          <span className="message-time">{timestamp}</span>
        </div>

        {/* Text Content */}
        {cleanContent && (
          <div className="message-text">
            {cleanContent}
          </div>
        )}

        {/* Voice Note Player */}
        {message.voiceUrl && (
          <VoicePlayer src={message.voiceUrl} />
        )}

        {/* File Attachment Card */}
        {message.fileUrl && (
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

        {/* Delivery / Read Status Footer */}
        {isSelf && (
          <div className="message-footer">
            <span className="msg-status-tick">
              {message.read ? <CheckCheck size={14} /> : <Check size={13} />}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
