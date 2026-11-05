import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function useSpeechRecognition({ onFinalResult } = {}) {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onFinalResultRef = useRef(onFinalResult);

  // Keep ref up to date without re-creating recognition
  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  const isSupported = Boolean(SpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setError(null);

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (finalText) {
        setTranscript((prev) => {
          const updated = prev ? prev + ' ' + finalText.trim() : finalText.trim();
          return updated;
        });
        setInterimTranscript('');
        if (onFinalResultRef.current) {
          onFinalResultRef.current(finalText.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // non-fatal
      if (event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    isSupported,
    error,
    reset,
  };
}

export default useSpeechRecognition;
