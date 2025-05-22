import React from 'react';
import './App.css';

export default function Header() {
  return (
    <div className="branding" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <img src="/logo192.png" alt="Kuchu Logo" className="logo" />
      <h1>Kuchu</h1>
    </div>
  );
}
