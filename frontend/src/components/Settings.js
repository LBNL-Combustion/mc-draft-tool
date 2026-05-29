import React, { useState } from 'react';
import { presetData, elbowData, pipeData } from '../data';

const sections = [
  { key: 'presetData', label: 'Preset Data', initial: presetData },
  { key: 'elbowData',  label: 'Elbow Data',  initial: elbowData  },
  { key: 'pipeData',   label: 'Pipe Data',   initial: pipeData   },
];

const CollapsibleSection = ({ label, initial }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(JSON.stringify(initial, null, 2));
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setError(null);
    setSaved(false);
    try {
      JSON.parse(text); // validate
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="settings-section">
      <button className="settings-section-header" onClick={() => setOpen(o => !o)}>
        <span className={`settings-chevron${open ? ' open' : ''}`}>▶</span>
        {label}
      </button>

      {open && (
        <div className="settings-section-body">
          <textarea
            className="settings-textarea"
            value={text}
            onChange={e => { setText(e.target.value); setError(null); setSaved(false); }}
            spellCheck={false}
          />
          {error && (
            <p className="settings-error">JSON error: {error}</p>
          )}
          <button className="settings-save-btn" onClick={handleSave}>
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      <p className="settings-description">Edit and save configuration data for each section below.</p>
      {sections.map(s => (
        <CollapsibleSection key={s.key} label={s.label} initial={s.initial} />
      ))}
    </div>
  );
};

export default Settings;
