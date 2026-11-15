import React from 'react';
// icons

export default function IncomingCallToast({
  callerId,
  allUsers = [],
  onAnswer,
  onDecline
}) {
  const caller = allUsers.find(u => u._id === callerId);
  const callerName = caller?.displayName || 'Teammate';

  return (
    <div className="incoming-call-toast" role="alert">
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00F0FF', boxShadow: '0 0 10px #00F0FF', animation: 'recPulse 1s infinite alternate' }} />
      <div className="incoming-call-text">
        Incoming WebRTC call from <b>{callerName}</b>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="toast-action-btn toast-answer-btn" onClick={onAnswer}>
          Answer
        </button>
        <button className="toast-action-btn toast-decline-btn" onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
}
