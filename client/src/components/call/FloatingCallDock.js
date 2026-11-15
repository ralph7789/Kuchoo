import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2, Monitor, Headphones } from '../common/Icons';

export default function FloatingCallDock({
  callUserId,
  allUsers = [],
  localStream,
  remoteStream,
  peerConnection,
  onEndCall,
  isHuddle = false,
  huddleTitle = '',
  huddleParticipants = [],
  onToggleScreenShare
}) {
  const [muted, setMuted] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const screenVideoRef = useRef(null);

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

  // Slack/Teams Screen Sharing Parity via getDisplayMedia
  const toggleScreenShare = async () => {
    if (isSharingScreen && screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsSharingScreen(false);
      if (onToggleScreenShare) onToggleScreenShare(false);

      // Revert video track on WebRTC peer connection if present
      if (peerConnection && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && videoTrack) {
          videoSender.replaceTrack(videoTrack).catch(e => console.warn('Track restore error:', e));
        }
      }
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen sharing is not supported by your current browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      setScreenStream(stream);
      setIsSharingScreen(true);
      if (onToggleScreenShare) onToggleScreenShare(true);

      const screenTrack = stream.getVideoTracks()[0];

      // Replace outgoing video track on peer connection
      if (peerConnection) {
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(screenTrack).catch(e => console.warn('Track replace error:', e));
        }
      }

      screenTrack.onended = () => {
        setScreenStream(null);
        setIsSharingScreen(false);
        if (onToggleScreenShare) onToggleScreenShare(false);
        if (peerConnection && localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender && videoTrack) {
            videoSender.replaceTrack(videoTrack).catch(e => console.warn('Track restore error:', e));
          }
        }
      };
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`floating-call-dock ${minimized ? 'minimized' : ''}`} style={isSharingScreen ? { width: 480, height: 360 } : {}}>
      {/* Dock Header */}
      <div className="floating-call-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isHuddle ? <Headphones size={15} color="#00F0FF" /> : null}
          <span style={{ fontSize: 13, fontWeight: 700, color: '#F8FAFC' }}>
            {isHuddle ? (huddleTitle || 'Channel Huddle') : (targetUser?.displayName || 'In Call')}
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

      {/* Video Streams & Screen Share Stage */}
      {!minimized && (
        <div className="video-grid-container" style={{ position: 'relative' }}>
          {/* Active Screen Share Presenter Stream */}
          {screenStream ? (
            <video
              autoPlay
              playsInline
              ref={el => {
                if (el) el.srcObject = screenStream;
                screenVideoRef.current = el;
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : remoteStream ? (
            <video
              autoPlay
              playsInline
              ref={el => { if (el) el.srcObject = remoteStream; }}
              className="call-video-remote"
            />
          ) : isHuddle ? (
            /* Huddle Audio Grid Roster */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#00F0FF', marginBottom: 12 }}>
                🎧 Live Channel Huddle ({huddleParticipants.length || 1} connected)
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(huddleParticipants.length > 0 ? huddleParticipants : [{ displayName: 'You', socketId: 'self' }]).map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: '#1E293B',
                      border: '2px solid #00F0FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#F8FAFC'
                    }}>
                      {p.displayName ? p.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{p.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
              Connecting Blitz WebRTC media stream...
            </div>
          )}

          {localStream && !screenStream && (
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

      {/* Controls Bar */}
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

        {/* Screen Share Button */}
        <button
          className="call-ctrl-btn"
          onClick={toggleScreenShare}
          title={isSharingScreen ? 'Stop screen sharing' : 'Share entire screen or application window'}
          style={isSharingScreen ? { background: '#00F0FF', color: '#090D16' } : {}}
        >
          <Monitor size={16} />
        </button>

        <button
          className="call-ctrl-btn end-call"
          onClick={onEndCall}
          title={isHuddle ? 'Leave Huddle' : 'End Call'}
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}

