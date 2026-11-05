import { useCallback, useRef, useState } from 'react';

const TRANSLATE_HISTORY_KEY = 'groqTranslationHistory';
const GROQ_API_KEY_KEY = 'groqApiKey';
const GROQ_MODEL_KEY = 'groqModel';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

function saveToHistory(german, english) {
  try {
    const stored = localStorage.getItem(TRANSLATE_HISTORY_KEY);
    const history = stored ? JSON.parse(stored) : [];
    const entry = {
      id: Date.now(),
      german,
      english,
      timestamp: new Date().toISOString(),
    };
    const updated = [entry, ...history].slice(0, 10);
    localStorage.setItem(TRANSLATE_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

function useGroqTranslation() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const translate = useCallback(async (germanText) => {
    if (!germanText || !germanText.trim()) return null;

    const apiKey = (localStorage.getItem(GROQ_API_KEY_KEY) || '').trim();
    if (!apiKey) {
      setError('No Groq API key set. Please add it in Account Settings.');
      return null;
    }

    const model = (localStorage.getItem(GROQ_MODEL_KEY) || FALLBACK_MODEL).trim();

    // Cancel any in-flight request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controllerRef.current = new AbortController();

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional German to English translator. Translate the following German text to English. Return ONLY the English translation, nothing else.',
            },
            {
              role: 'user',
              content: germanText.trim(),
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
        signal: controllerRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const translated = data?.choices?.[0]?.message?.content?.trim();
      if (translated) {
        saveToHistory(germanText.trim(), translated);
      }
      return translated || null;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      setError(err.message || 'Translation failed. Please check your API key.');
      return null;
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return { translate, isTranslating, error };
}

export default useGroqTranslation;
