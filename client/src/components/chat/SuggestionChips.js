import React from 'react';
// icons

export default function SuggestionChips({ onSelectChip }) {
  const chips = [
    { label: '✨ Summarize conversation', prompt: '@aladin summarize our discussion so far' },
    { label: '✨ Extract action items', prompt: '@aladin what are the action items from this thread?' },
    { label: '✨ Draft team announcement', prompt: '@aladin help me draft a team update announcement' },
    { label: '✨ Code review checklist', prompt: '@aladin generate a production release checklist' }
  ];

  return (
    <div className="suggestion-chips-bar">
      {chips.map((chip, idx) => (
        <button
          key={idx}
          className="suggestion-chip"
          onClick={() => onSelectChip(chip.prompt)}
        >
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
}
