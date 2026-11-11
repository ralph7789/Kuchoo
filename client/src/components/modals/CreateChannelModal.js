import React, { useState } from 'react';
import { X, Hash } from '../common/Icons';

export default function CreateChannelModal({
  isOpen,
  onClose,
  onCreate,
  users = []
}) {
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a channel name');
      return;
    }
    onCreate({ name: name.trim().toLowerCase().replace(/\s+/g, '-'), members: selectedMembers });
    setName('');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hash size={18} color="#00F0FF" />
            <span>Create New Channel</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ color: '#F43F5E', fontSize: 13 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="modal-form-group">
            <label className="modal-label">Channel Name</label>
            <input
              className="modal-input"
              placeholder="e.g. engineering, announcements"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-form-group">
            <label className="modal-label">Add Members ({selectedMembers.length} selected)</label>
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              {users.map(u => (
                <label
                  key={u._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: selectedMembers.includes(u._id) ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    fontSize: 13
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(u._id)}
                    onChange={() => toggleMember(u._id)}
                  />
                  <span>{u.displayName} ({u.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary">
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
