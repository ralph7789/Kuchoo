import React from 'react';
import './App.css';

export default function Header() {
  return (
    <div className="branding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
      <img src="/logo192.png" alt="Kuchoo Logo" className="logo" style={{ width: 44, height: 44, borderRadius: 10 }} />
      <div style={{ textAlign: 'left' }}>
        <h1 style={{ margin: 0, fontSize: 26, letterSpacing: -0.5 }}>Kuchoo</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#00F0FF', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
            Xcorp Realtime Chat
          </span>
          <span style={{ fontSize: 10, background: 'rgba(0, 240, 255, 0.15)', color: '#00F0FF', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(0,240,255,0.3)' }}>
            v2.0
          </span>
        </div>
      </div>
    </div>
  );
}
