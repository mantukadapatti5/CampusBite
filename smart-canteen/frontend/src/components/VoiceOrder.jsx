import React, { useState, useRef } from 'react';

// Uses the browser's built-in SpeechRecognition (webkitSpeechRecognition on
// Chrome/Edge). This is a real, working implementation — but browser support
// is inconsistent (works well on Chrome/Edge desktop & Android, not on
// Firefox or iOS Safari). No server or API key is involved; everything runs
// client-side. If unsupported, the mic button just doesn't render.
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export default function VoiceOrder({ onResult }) {
  const [listening, setListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');
  const [matched, setMatched] = useState(null);
  const recognitionRef = useRef(null);

  if (!SpeechRecognition) return null;

  function startListening() {
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setLastHeard(transcript);
      const found = onResult(transcript);
      setMatched(found ? found.name : null);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="flex flex-col items-end">
      <button
        onClick={startListening}
        className={`btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 ${listening ? 'border-signal text-signal' : ''}`}
        title="Order by voice"
      >
        🎤 {listening ? 'Listening…' : 'Voice order'}
      </button>
      {lastHeard && (
        <p className="text-[11px] text-paper/40 mt-1 max-w-[180px] text-right">
          Heard: "{lastHeard}" {matched ? `→ added ${matched}` : '— no match found'}
        </p>
      )}
    </div>
  );
}
