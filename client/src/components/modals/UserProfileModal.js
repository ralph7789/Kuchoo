import React, { useState } from 'react';
import { X, LogOut } from '../common/Icons';

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  onLogout
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await onUpdateProfile({ displayName, password: password || undefined });
      setSuccess('Profile updated successfully');
      setPassword('');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const isAdmin = Boolean(user?.isAdmin || (user?.roles && (user.roles.includes('admin') || user.roles.includes('xadmin'))));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">User Profile & Settings</div>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>{user?.displayName}</div>
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

        {success && <div style={{ color: '#10B981', fontSize: 13 }}>{success}</div>}
        {error && <div style={{ color: '#F43F5E', fontSize: 13 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
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
