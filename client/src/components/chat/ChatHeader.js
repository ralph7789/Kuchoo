import React from 'react';
import { Phone, Video, Info, Hash, AtSign, Sparkles } from '../common/Icons';

export default function ChatHeader({
  activeTarget,
  userStatus = {},
  onStartAudioCall,
  onStartVideoCall,
  onToggleInspector,
  inspectorOpen
}) {
  if (!activeTarget) return null;

  const isUser = activeTarget.type === 'user';
  const isGroup = activeTarget.type === 'group';
  const isAladin = activeTarget.type === 'aladin';

  const targetUser = isUser ? activeTarget.user : null;
  const targetGroup = isGroup ? activeTarget.group : null;
  const isOnline = isUser ? Boolean(userStatus[targetUser?._id]) : true;

  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div className="chat-header-title">
          {isGroup && <Hash size={20} color="#00F0FF" />}
          {isUser && <AtSign size={19} color="#94A3B8" />}
          {isAladin && <Sparkles size={19} color="#8B5CF6" />}
          <span>{activeTarget.name}</span>
        </div>

        <div className="chat-header-subtitle">
          {isUser && (
            <span style={{ color: isOnline ? '#10B981' : '#64748B' }}>
              {isOnline ? '● Active Now' : '○ Offline'}
            </span>
          )}
          {isGroup && (
            <span>{targetGroup?.members?.length || 0} members</span>
          )}
          {isAladin && (
            <span style={{ color: '#A78BFA' }}>Autonomous Copilot Active</span>
          )}
        </div>
      </div>

      <div className="chat-header-actions">
        {/* Call triggers for DMs */}
        {isUser && (
          <>
            <button
              className="header-action-btn header-call-btn"
              title="Start Audio Call"
              onClick={() => onStartAudioCall(targetUser._id)}
            >
              <Phone size={17} />
            </button>
            <button
              className="header-action-btn header-call-btn"
              title="Start Video Call"
              onClick={() => onStartVideoCall(targetUser._id)}
            >
              <Video size={17} />
            </button>
          </>
        )}

        {/* Inspector Pane Toggle */}
        <button
          className={`header-action-btn ${inspectorOpen ? 'active' : ''}`}
          title="Toggle Details Pane"
          onClick={onToggleInspector}
        >
          <Info size={17} />
        </button>
      </div>
    </header>
  );
}
