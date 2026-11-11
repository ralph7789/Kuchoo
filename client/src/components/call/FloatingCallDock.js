import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from '../common/Icons';

export default function FloatingCallDock({
  callUserId,
  allUsers = [],
  localStream,
  remoteStream,
  onEndCall
}) {
  const [muted, setMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const targetUser = allUsers.find(u => u._id === callUserId);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setMuted(!muted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setVideoDisabled(!videoDisabled);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`floating-call-dock ${minimized ? 'minimized' : ''}`}>
      {/* Dock Header */}
      <div className="floating-call-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
            {targetUser?.displayName || 'In Call'}
          </span>
          <span className="call-timer-pill">{formatTimer(elapsedSeconds)}</span>
        </div>

        <button
          className="dock-icon-btn"
          style={{ width: 26, height: 26 }}
          onClick={() => setMinimized(!minimized)}
          title={minimized ? 'Expand call window' : 'Minimize call window'}
        >
          {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </div>

      {/* Video Streams */}
      {!minimized && (
        <div className="video-grid-container">
          {remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={el => { if (el) el.srcObject = remoteStream; }}
              className="call-video-remote"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
              Connecting Blitz WebRTC media stream...
            </div>
          )}

          {localStream && (
            <video
              autoPlay
              muted
              playsInline
              ref={el => { if (el) el.srcObject = localStream; }}
              className="call-video-local"
            />
          )}
        </div>
      )}

      {/* Controls */}
      <div className="floating-call-controls">
        <button
          className="call-ctrl-btn"
          onClick={toggleMute}
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
          style={muted ? { background: '#F43F5E', color: '#fff' } : {}}
        >
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          className="call-ctrl-btn"
          onClick={toggleVideo}
          title={videoDisabled ? 'Turn camera on' : 'Turn camera off'}
          style={videoDisabled ? { background: '#F43F5E', color: '#fff' } : {}}
        >
          {videoDisabled ? <VideoOff size={16} /> : <Video size={16} />}
        </button>

        <button
          className="call-ctrl-btn end-call"
          onClick={onEndCall}
          title="End Call"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
