import React, { useRef } from 'react';
import { Paperclip, Mic, MicOff, Send, Sparkles } from '../common/Icons';

export default function RichInputDock({
  content,
  setContent,
  onSend,
  onFileUpload,
  recording,
  onStartRecording,
  onStopRecording,
  onTriggerAladin
}) {
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  const handleTextareaChange = (e) => {
    setContent(e.target.value);
    // Auto-expand textarea up to max-height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  };

  return (
    <div className="rich-input-dock-container">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileUpload}
      />

      <div className="rich-input-wrapper">
        <textarea
          ref={textareaRef}
          className="rich-textarea"
          placeholder="Message or type @aladin for AI copilot... (Enter to send, Shift+Enter for newline)"
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <div className="rich-dock-actions">
          <div className="rich-dock-left-tools">
            <button
              type="button"
              className="dock-icon-btn"
              title="Attach File or Document"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <Paperclip size={18} />
            </button>

            <button
              type="button"
              className={`dock-icon-btn ${recording ? 'recording' : ''}`}
              title={recording ? 'Stop Recording Voice Note' : 'Record Voice Note'}
              onClick={recording ? onStopRecording : onStartRecording}
            >
              {recording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <button
              type="button"
              className="dock-icon-btn"
              title="Insert @aladin Copilot Prompt"
              onClick={onTriggerAladin}
              style={{ color: '#8B5CF6' }}
            >
              <Sparkles size={17} />
            </button>
          </div>

          <div className="rich-dock-right-tools">
            <button
              type="button"
              className="send-msg-btn"
              title="Send Message"
              disabled={!content.trim() && !recording}
              onClick={onSend}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
