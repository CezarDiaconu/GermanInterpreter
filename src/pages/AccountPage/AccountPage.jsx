import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './AccountPage.module.css';

const GROQ_KEY_STORAGE = 'groqApiKey';
const GROQ_MODEL_STORAGE = 'groqModel';
const HISTORY_KEY = 'groqTranslationHistory';

function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);
  const [testStatus, setTestStatus] = useState(null); // null | 'fetching' | 'ok' | { error: string }
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem(GROQ_KEY_STORAGE) || '';
    const storedModel = localStorage.getItem(GROQ_MODEL_STORAGE) || '';
    setApiKey(storedKey);
    setSelectedModel(storedModel);
    loadHistory();
  }, []);

  function loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      setHistory(stored ? JSON.parse(stored) : []);
    } catch {
      setHistory([]);
    }
  }

  const handleSave = () => {
    localStorage.setItem(GROQ_KEY_STORAGE, apiKey.trim());
    if (selectedModel) localStorage.setItem(GROQ_MODEL_STORAGE, selectedModel);
    setSaved(true);
    setTestStatus(null);
    setTimeout(() => setSaved(false), 2500);
  };

  // Fetch the list of models available to this API key, then pick the first chat model
  const handleFetchModels = async () => {
    const key = apiKey.trim();
    if (!key) {
      setTestStatus({ error: 'Please enter an API key first.' });
      return;
    }
    setTestStatus('fetching');
    setAvailableModels([]);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setTestStatus({ error: data?.error?.message || `HTTP ${res.status}` });
        return;
      }
      // Filter to chat-compatible models (exclude whisper / tts / guard)
      const chatModels = (data.data || [])
        .filter((m) => !m.id.includes('whisper') && !m.id.includes('tts') && !m.id.includes('guard'))
        .sort((a, b) => a.id.localeCompare(b.id));
      setAvailableModels(chatModels);

      // Auto-select previously chosen model, or pick first available
      const stored = localStorage.getItem(GROQ_MODEL_STORAGE);
      const autoSelect = stored && chatModels.find((m) => m.id === stored)
        ? stored
        : chatModels[0]?.id || '';
      setSelectedModel(autoSelect);
      localStorage.setItem(GROQ_KEY_STORAGE, key);
      if (autoSelect) localStorage.setItem(GROQ_MODEL_STORAGE, autoSelect);
      setTestStatus('ok');
    } catch (err) {
      setTestStatus({ error: err.message || 'Network error — check your connection.' });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleClearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.slice(0, 6) + '•'.repeat(Math.min(key.length - 10, 20)) + key.slice(-4);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h2 className={styles.pageTitle}>Account</h2>

        {/* Profile Card */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>👤</span>
            <h3 className={styles.cardTitle}>Profile</h3>
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className={styles.profileDetails}>
              <p className={styles.profileName}>{user?.name}</p>
              <p className={styles.profileEmail}>{user?.email}</p>
              {user?.createdAt && (
                <p className={styles.profileMeta}>
                  Member since {formatDate(user.createdAt)}
                </p>
              )}
            </div>
          </div>
          <button className={styles.signOutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </section>

        {/* API Key Settings */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🔑</span>
            <h3 className={styles.cardTitle}>API Settings</h3>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="groq-key">
              Groq API Key
            </label>
            <input
              id="groq-key"
              className={styles.input}
              type="password"
              placeholder="gsk_••••••••••••••••••••••••••••"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setSaved(false); setTestStatus(null); setAvailableModels([]); }}
              autoComplete="off"
              spellCheck={false}
            />
            {apiKey && (
              <span className={styles.keyPreview}>{maskKey(apiKey)}</span>
            )}
          </div>
          <p className={styles.apiKeyHint}>
            Get your free Groq API key at{' '}
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              console.groq.com
            </a>
            . Your key is stored locally in your browser and never sent to our servers.
          </p>

          {/* Step 1: fetch available models */}
          <div className={styles.apiKeyActions}>
            <button
              className={styles.testBtn}
              onClick={handleFetchModels}
              disabled={testStatus === 'fetching'}
            >
              {testStatus === 'fetching' ? 'Loading models…' : '🔍 Load My Available Models'}
            </button>
          </div>

          {/* Step 2: pick a model */}
          {availableModels.length > 0 && (
            <div className={styles.field} style={{ marginTop: '1rem' }}>
              <label className={styles.label} htmlFor="groq-model">
                Translation Model
              </label>
              <select
                id="groq-model"
                className={styles.input}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))}
              </select>
              <p className={styles.apiKeyHint} style={{ marginTop: '0.5rem' }}>
                These are the models your API key actually has access to.
              </p>
            </div>
          )}

          {/* Step 3: save */}
          {testStatus === 'ok' && (
            <>
              <p className={styles.testOk}>✅ Models loaded! Select one above then save.</p>
              <button
                className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
                onClick={handleSave}
                style={{ marginTop: '0.75rem' }}
              >
                {saved ? '✓ Saved!' : 'Save Settings'}
              </button>
            </>
          )}

          {testStatus?.error && (
            <p className={styles.testError}>❌ {testStatus.error}</p>
          )}
        </section>

        {/* Translation History */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📜</span>
            <h3 className={styles.cardTitle}>Translation History</h3>
            {history.length > 0 && (
              <button className={styles.clearBtn} onClick={handleClearHistory}>
                Clear All
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className={styles.emptyHistory}>
              <span className={styles.emptyIcon}>🔍</span>
              <p>No translations yet. Start speaking on the Translate page!</p>
            </div>
          ) : (
            <ul className={styles.historyList}>
              {history.map((item) => (
                <li key={item.id} className={styles.historyItem}>
                  <div className={styles.historyMeta}>{formatDate(item.timestamp)}</div>
                  <div className={styles.historyPair}>
                    <div className={styles.historySegment}>
                      <span className={styles.historyLang}>🇩🇪 DE</span>
                      <p className={styles.historyText}>{item.german}</p>
                    </div>
                    <div className={styles.historyArrow}>→</div>
                    <div className={styles.historySegment}>
                      <span className={styles.historyLang}>🇺🇸 EN</span>
                      <p className={styles.historyText}>{item.english}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default AccountPage;
