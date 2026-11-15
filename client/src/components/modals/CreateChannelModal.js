import React, { useState } from 'react';
import { X, Hash, Lock, Search } from '../common/Icons';

export default function CreateChannelModal({
  isOpen,
  onClose,
  onCreate,
  users = []
}) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a channel name');
      return;
    }
    onCreate({
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      topic: topic.trim(),
      description: description.trim(),
      isPrivate,
      members: selectedMembers
    });
    setName('');
    setTopic('');
    setDescription('');
    setIsPrivate(false);
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPrivate ? <Lock size={18} color="#F59E0B" /> : <Hash size={18} color="#00F0FF" />}
            <span>Create a {isPrivate ? 'Private' : 'Public'} Channel</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ color: '#F43F5E', fontSize: 13, marginTop: -4 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Channel Name */}
          <div className="modal-form-group">
            <label className="modal-label">Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 12, color: '#94A3B8', fontWeight: 700 }}>#</span>
              <input
                className="modal-input"
                style={{ paddingLeft: 28 }}
                placeholder="e.g. project-x, release-v2"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Channel Topic */}
          <div className="modal-form-group">
            <label className="modal-label">Topic <span style={{ color: '#64748B', fontWeight: 400 }}>(optional)</span></label>
            <input
              className="modal-input"
              placeholder="What is this channel about?"
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>

          {/* Privacy Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 8,
            background: isPrivate ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: isPrivate ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: isPrivate ? '#F59E0B' : '#F8FAFC' }}>
                <Lock size={15} />
                <span>Make channel private</span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                {isPrivate ? 'Only invited members can view or join this channel.' : 'Anyone in your workspace can view and join.'}
              </div>
            </div>
            <input
              type="checkbox"
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#F59E0B' }}
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
            />
          </div>

          {/* Members Selection */}
          <div className="modal-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="modal-label" style={{ marginBottom: 0 }}>Add Members ({selectedMembers.length} selected)</label>
            </div>

            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                className="modal-input"
                style={{ fontSize: 12, padding: '6px 10px' }}
                placeholder="Filter members..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
              {filteredUsers.map(u => (
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
              {filteredUsers.length === 0 && (
                <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center', padding: 12 }}>No matching members</div>
              )}
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
