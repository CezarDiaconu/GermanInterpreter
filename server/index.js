import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb, getPool } from './db.js';
import { requireAuth, JWT_SECRET } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json());

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    groqApiKey: row.groq_api_key || '',
    groqModel: row.groq_model || 'llama-3.1-8b-instant',
    createdAt: row.created_at,
  };
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, groq_api_key, groq_model, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    const user = formatUser(rows[0]);
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Sign In
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, groq_api_key, groq_model, created_at FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const row = rows[0];
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = formatUser(row);
    const token = signToken(user);

    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to sign in.' });
  }
});

// Current User
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, name, email, groq_api_key, groq_model, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: formatUser(rows[0]) });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to load user profile.' });
  }
});

// Update Account Settings (Groq API key & model)
app.put('/api/account/settings', requireAuth, async (req, res) => {
  try {
    const groqApiKey = typeof req.body?.groqApiKey === 'string' ? req.body.groqApiKey.trim() : null;
    const groqModel = typeof req.body?.groqModel === 'string' && req.body.groqModel.trim()
      ? req.body.groqModel.trim()
      : 'llama-3.1-8b-instant';

    const pool = getPool();
    await pool.query(
      'UPDATE users SET groq_api_key = ?, groq_model = ? WHERE id = ?',
      [groqApiKey || null, groqModel, req.user.id]
    );

    const [rows] = await pool.query(
      'SELECT id, name, email, groq_api_key, groq_model, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ user: formatUser(rows[0]) });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

// Get Translation History
app.get('/api/translations', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, german_text AS german, english_text AS english, topic, created_at AS timestamp
       FROM translations
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ translations: rows });
  } catch (err) {
    console.error('Get translations error:', err);
    res.status(500).json({ error: 'Failed to load translation history.' });
  }
});

// Save Translation
app.post('/api/translations', requireAuth, async (req, res) => {
  try {
    const german = (req.body?.german || '').trim();
    const english = (req.body?.english || '').trim();
    const topic = (req.body?.topic || 'general').trim();

    if (!german || !english) {
      return res.status(400).json({ error: 'German and English text are required.' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO translations (user_id, german_text, english_text, topic) VALUES (?, ?, ?, ?)',
      [req.user.id, german, english, topic]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Save translation error:', err);
    res.status(500).json({ error: 'Failed to save translation.' });
  }
});

// Clear Translation History
app.delete('/api/translations', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM translations WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete translations error:', err);
    res.status(500).json({ error: 'Failed to clear translation history.' });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`GermanLive API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL:', err?.message || err?.code || err);
    if (err?.errors) {
      console.error('Details:', err.errors.map((e) => `${e.code || ''} ${e.message || e}`).join(' | '));
    }
    process.exit(1);
  });
