import React, { useState } from 'react';
import { X, LogOut, Smile } from '../common/Icons';

const STATUS_PRESETS = [
  { emoji: '💬', text: 'In a meeting' },
  { emoji: '🎯', text: 'Deep focus / coding' },
  { emoji: '🏡', text: 'Working remotely' },
  { emoji: '🍔', text: 'Out for lunch' },
  { emoji: '🌴', text: 'Vacationing' },
  { emoji: '🤒', text: 'Out sick' },
  { emoji: '🚀', text: 'Shipping release' }
];

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onLogout
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [statusText, setStatusText] = useState(user?.customStatus?.text || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.customStatus?.emoji || '💬');
  const [dnd, setDnd] = useState(Boolean(user?.dnd));
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await onUpdateProfile({
        displayName,
        password: password || undefined,
        customStatus: {
          text: statusText.trim(),
          emoji: statusText.trim() ? statusEmoji : ''
        },
        dnd
      });
      setSuccess('Profile & Status updated successfully');
      setPassword('');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 900);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const isAdmin = Boolean(user?.isAdmin || (user?.roles && (user.roles.includes('admin') || user.roles.includes('xadmin'))));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">User Profile & Presence</div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Identity & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
            {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>{user?.displayName}</span>
              {user?.customStatus?.text && (
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  {user.customStatus.emoji} {user.customStatus.text}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{user?.email}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: isAdmin ? '#10B981' : '#3B82F6', color: '#fff', fontWeight: 700 }}>
                {isAdmin ? '🛡️ XAdmin' : 'Standard'}
              </span>
              {user?.xidId && (
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#0891B2', color: '#fff', fontWeight: 700 }}>
                  ⚡ XID Account
                </span>
              )}
            </div>
          </div>
        </div>

        {success && <div style={{ color: '#10B981', fontSize: 13, marginTop: -4 }}>{success}</div>}
        {error && <div style={{ color: '#F43F5E', fontSize: 13, marginTop: -4 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Custom Status Picker (Slack/Teams parity) */}
          <div className="modal-form-group">
            <label className="modal-label">Custom Status Message</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {statusEmoji}
              </span>
              <input
                className="modal-input"
                style={{ flex: 1 }}
                placeholder="What is your current status?"
                value={statusText}
                onChange={e => setStatusText(e.target.value)}
              />
              {statusText && (
                <button
                  type="button"
                  className="modal-btn-secondary"
                  style={{ padding: '0 10px', fontSize: 12 }}
                  onClick={() => {
                    setStatusText('');
                    setStatusEmoji('💬');
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {STATUS_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setStatusEmoji(p.emoji);
                    setStatusText(p.text);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: statusText === p.text ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: statusText === p.text ? '1px solid #00F0FF' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: statusText === p.text ? '#00F0FF' : '#94A3B8',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span>{p.emoji}</span>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Do Not Disturb Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: 8,
            background: dnd ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: dnd ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: dnd ? '#F43F5E' : '#F8FAFC' }}>
                Do Not Disturb (DND)
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                Mute sound & desktop alert notifications
              </div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#F43F5E' }}
              checked={dnd}
              onChange={e => setDnd(e.target.checked)}
            />
          </div>

          {/* Account Details */}
          <div className="modal-form-group">
            <label className="modal-label">Display Name</label>
            <input
              className="modal-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display Name"
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">New Password (leave blank to keep current)</label>
            <input
              type="password"
              className="modal-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <button
              type="button"
              className="modal-btn-secondary"
              onClick={onLogout}
              style={{ color: '#F43F5E', borderColor: 'rgba(244, 63, 94, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={15} /> Sign Out
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="modal-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modal-btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

