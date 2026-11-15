import React from 'react';
import { Phone, Video, Info, Hash, AtSign, Sparkles, Lock, Star, Headphones } from '../common/Icons';

export default function ChatHeader({
  activeTarget,
  userStatus = {},
  onStartAudioCall,
  onStartVideoCall,
  onToggleInspector,
  inspectorOpen,
  starredIds = [],
  onToggleStar,
  onStartHuddle
}) {
  if (!activeTarget) return null;

  const isUser = activeTarget.type === 'user';
  const isGroup = activeTarget.type === 'group';
  const isAladin = activeTarget.type === 'aladin';

  const targetUser = isUser ? activeTarget.user : null;
  const targetGroup = isGroup ? activeTarget.group : null;
  const isPrivateGroup = isGroup && (targetGroup?.isPrivate || targetGroup?.isPublic === false);
  const isOnline = isUser ? Boolean(userStatus[targetUser?._id]) : true;
  const isStarred = Boolean(activeTarget?.id && starredIds.includes(activeTarget.id));

  return (
    <header className="chat-header">
      <div className="chat-header-info">
        <div className="chat-header-title">
          {isGroup && (
            isPrivateGroup ? <Lock size={19} color="#F59E0B" /> : <Hash size={20} color="#00F0FF" />
          )}
          {isUser && <AtSign size={19} color="#94A3B8" />}
          {isAladin && <Sparkles size={19} color="#8B5CF6" />}
          <span>{activeTarget.name}</span>

          {onToggleStar && (
            <button
              className="chat-header-star-btn"
              title={isStarred ? 'Unstar' : 'Star channel / conversation'}
              onClick={() => onToggleStar(activeTarget.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                display: 'inline-flex',
                alignItems: 'center',
                color: isStarred ? '#F59E0B' : '#64748B'
              }}
            >
              <Star size={15} color={isStarred ? '#F59E0B' : '#64748B'} fill={isStarred ? '#F59E0B' : 'none'} />
            </button>
          )}
        </div>

        <div className="chat-header-subtitle">
          {isUser && (
            <span style={{ color: isOnline ? '#10B981' : '#64748B' }}>
              {isOnline ? '● Active Now' : '○ Offline'}
            </span>
          )}
          {isGroup && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{targetGroup?.members?.length || 0} members</span>
              {targetGroup?.topic && (
                <>
                  <span style={{ opacity: 0.4 }}>|</span>
                  <span style={{ color: '#94A3B8', maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {targetGroup.topic}
                  </span>
                </>
              )}
            </div>
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

        {/* Huddle trigger for Group Channels (Slack Huddles parity) */}
        {isGroup && onStartHuddle && (
          <button
            className="header-action-btn header-call-btn"
            title="Start or Join Channel Huddle"
            onClick={() => onStartHuddle(targetGroup)}
            style={{
              padding: '0 10px',
              gap: 6,
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 240, 255, 0.1)',
              borderColor: 'rgba(0, 240, 255, 0.3)',
              color: '#00F0FF',
              fontWeight: 600,
              fontSize: 12
            }}
          >
            <Headphones size={15} />
            <span>Huddle</span>
          </button>
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
