import { useState, useCallback, useRef, useEffect } from 'react';
import useSpeechRecognition from '../../hooks/useSpeechRecognition.js';
import useGroqTranslation from '../../hooks/useGroqTranslation.js';
import styles from './TranslatePage.module.css';

const GROQ_KEY_STORAGE = 'groqApiKey';

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function TranslatePage() {
  const [translations, setTranslations] = useState([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const translationEndRef = useRef(null);
  const germanEndRef = useRef(null);

  useEffect(() => {
    const key = localStorage.getItem(GROQ_KEY_STORAGE);
    setHasApiKey(Boolean(key && key.trim()));

    // Listen for storage changes (e.g., user saved key on account page)
    const handler = () => {
      const k = localStorage.getItem(GROQ_KEY_STORAGE);
      setHasApiKey(Boolean(k && k.trim()));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { translate, isTranslating, error: translationError } = useGroqTranslation();

  const handleFinalResult = useCallback(
    async (finalText) => {
      if (!finalText.trim()) return;
      const result = await translate(finalText);
      if (result) {
        setTranslations((prev) => [
          ...prev,
          { id: Date.now(), german: finalText, english: result },
        ]);
      }
    },
    [translate]
  );

  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    isSupported,
    error: speechError,
    reset: resetSpeech,
  } = useSpeechRecognition({ onFinalResult: handleFinalResult });

  // Auto scroll panels
  useEffect(() => {
    translationEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [translations]);

  useEffect(() => {
    germanEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript, interimTranscript]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleClear = () => {
    stopListening();
    resetSpeech();
    setTranslations([]);
  };

  const combinedGerman = transcript
    ? interimTranscript
      ? transcript + ' ' + interimTranscript
      : transcript
    : interimTranscript;

  const hasContent = combinedGerman || translations.length > 0;
  const displayError = speechError || translationError;

  return (
    <div className={styles.page}>
      {/* Warning Banner */}
      {!hasApiKey && (
        <div className={styles.warningBanner}>
          <span className={styles.warningIcon}>⚠️</span>
          <span>
            Please set your Groq API key in{' '}
            <a href="/account">Account Settings</a> to enable translation.
          </span>
        </div>
      )}

      {!isSupported && (
        <div className={styles.warningBanner} style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: 'rgba(255, 71, 87, 0.3)', color: 'var(--danger)' }}>
          <span className={styles.warningIcon}>🚫</span>
          Speech recognition is not supported in this browser. Please use Chrome or Edge.
        </div>
      )}

      {/* Error Banner */}
      {displayError && (
        <div className={styles.errorBanner}>
          <span>⚠️ {displayError}</span>
        </div>
      )}

      {/* Main Interface */}
      <div className={styles.panels}>
        {/* German Panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelFlag}>🇩🇪</span>
            <h2 className={styles.panelTitle}>German (Original)</h2>
            {isListening && (
              <span className={styles.liveBadge}>● LIVE</span>
            )}
          </div>
          <div className={styles.panelBody} ref={germanEndRef}>
            {!combinedGerman && !isListening && (
              <p className={styles.placeholder}>
                Your spoken German will appear here...
              </p>
            )}
            {!combinedGerman && isListening && (
              <p className={styles.listeningPrompt}>
                🎙️ Listening for German speech...
              </p>
            )}
            {transcript && (
              <span className={styles.finalText}>{transcript}</span>
            )}
            {interimTranscript && (
              <span className={styles.interimText}> {interimTranscript}</span>
            )}
            <div ref={germanEndRef} />
          </div>
        </div>

        {/* English Panel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelFlag}>🇺🇸</span>
            <h2 className={styles.panelTitle}>English (Translation)</h2>
            {isTranslating && (
              <span className={styles.translatingBadge}>
                <span className={styles.translatingDot}></span>
                Translating
              </span>
            )}
          </div>
          <div className={styles.panelBody}>
            {translations.length === 0 && !isTranslating && (
              <p className={styles.placeholder}>
                English translation will appear here...
              </p>
            )}
            {translations.map((item) => (
              <p key={item.id} className={styles.translationParagraph}>
                {item.english}
              </p>
            ))}
            {isTranslating && (
              <div className={styles.translatingIndicator}>
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={translationEndRef} />
          </div>
        </div>
      </div>

      {/* Mic Controls */}
      <div className={styles.controls}>
        {hasContent && (
          <button className={styles.clearBtn} onClick={handleClear} title="Clear all">
            🗑️ Clear
          </button>
        )}

        <div className={styles.micWrapper}>
          <button
            className={`${styles.micBtn} ${isListening ? styles.micBtnListening : ''}`}
            onClick={handleMicToggle}
            disabled={!isSupported}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? <StopIcon /> : <MicIcon />}
          </button>
          <span className={styles.micLabel}>
            {isListening ? 'Listening… click to stop' : 'Click to speak'}
          </span>
        </div>

        <div className={styles.spacer} />
      </div>

      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span
            className={`${styles.statusDot} ${isListening ? styles.statusDotActive : ''}`}
          />
          {isListening ? 'Microphone active' : 'Microphone inactive'}
        </div>
        <div className={styles.statusItem}>
          🌐 de-DE → en-US
        </div>
        <div className={styles.statusItem}>
          🤖 llama3-8b-8192
        </div>
        {translations.length > 0 && (
          <div className={styles.statusItem}>
            {translations.length} translation{translations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export default TranslatePage;
