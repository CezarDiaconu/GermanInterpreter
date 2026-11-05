import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './AuthPage.module.css';

function AuthPage() {
  const { isAuthenticated, login, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin'); // 'signin' | 'signup'

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError] = useState('');
  const [siLoading, setSiLoading] = useState(false);

  // Sign-up state
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suConfirm, setSuConfirm] = useState('');
  const [suError, setSuError] = useState('');
  const [suLoading, setSuLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/translate" replace />;
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    setSiError('');
    if (!siEmail || !siPassword) {
      setSiError('Please enter your email and password.');
      return;
    }
    setSiLoading(true);
    // Simulate a small network delay for realism
    await new Promise((r) => setTimeout(r, 400));
    login(siEmail, siPassword);
    navigate('/translate');
    setSiLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setSuError('');
    const result = signUp(suName, suEmail, suPassword, suConfirm);
    if (!result.success) {
      setSuError(result.error);
      return;
    }
    setSuLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    navigate('/translate');
    setSuLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎙️</span>
          <h1 className={styles.logoName}>GermanLive</h1>
          <p className={styles.logoTagline}>Live German → English Translation</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={tab === 'signin' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => { setTab('signin'); setSiError(''); }}
          >
            Sign In
          </button>
          <button
            className={tab === 'signup' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => { setTab('signup'); setSuError(''); }}
          >
            Sign Up
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form className={styles.form} onSubmit={handleSignIn} noValidate>
            {siError && <div className={styles.errorBanner}>{siError}</div>}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="si-email">Email</label>
              <input
                id="si-email"
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="si-password">Password</label>
              <input
                id="si-password"
                className={styles.input}
                type="password"
                placeholder="••••••••"
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={siLoading}>
              {siLoading ? (
                <span className={styles.spinner}></span>
              ) : (
                'Sign In'
              )}
            </button>
            <p className={styles.hint}>
              Any email & password combination works for this demo.
            </p>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form className={styles.form} onSubmit={handleSignUp} noValidate>
            {suError && <div className={styles.errorBanner}>{suError}</div>}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="su-name">Name</label>
              <input
                id="su-name"
                className={styles.input}
                type="text"
                placeholder="Your name"
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="su-email">Email</label>
              <input
                id="su-email"
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="su-password">Password</label>
              <input
                id="su-password"
                className={styles.input}
                type="password"
                placeholder="Min. 6 characters"
                value={suPassword}
                onChange={(e) => setSuPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="su-confirm">Confirm Password</label>
              <input
                id="su-confirm"
                className={styles.input}
                type="password"
                placeholder="Repeat password"
                value={suConfirm}
                onChange={(e) => setSuConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={suLoading}>
              {suLoading ? (
                <span className={styles.spinner}></span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AuthPage;
