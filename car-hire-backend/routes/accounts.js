const express = require('express');
const bcrypt = require('bcrypt');
const { rateLimit } = require('express-rate-limit');

function validateSession(db) {
  return (req, res, next) => {
    if (!req.session.userId) return next();
    db.query('SELECT id, username, account_role, is_active, password_version FROM users WHERE id = ?', [req.session.userId], (error, users) => {
      if (error) return res.status(503).json({ error: 'Account verification unavailable. Please retry.' });
      const user = users[0];
      if (!user || !user.is_active || Number(user.password_version) !== Number(req.session.passwordVersion || 0)) {
        return req.session.destroy(() => req.method === 'GET' && !req.path.startsWith('/api/') ? res.redirect('/login') : res.status(401).json({ error: 'Please sign in again.' }));
      }
      req.adminAccount = user;
      next();
    });
  };
}

function createAccountRouter(db) {
  const router = express.Router();
  const query = async (sql, params = []) => (await db.promise().query(sql, params))[0];
  const run = handler => (req, res) => Promise.resolve(handler(req, res)).catch(error => {
    console.error('Account operation failed:', error.code || error.name);
    res.status(500).json({ error: 'Could not update the account. Please retry.' });
  });
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!req.adminAccount) return res.status(401).json({ error: 'Authentication required.' });
    if (req.method !== 'GET') {
      const origin = req.get('origin');
      if (!req.is('application/json') || (origin && origin !== `${req.protocol}://${req.get('host')}`)) {
        return res.status(403).json({ error: 'Use the account page on this admin site.' });
      }
    }
    next();
  });
  router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, keyGenerator: req => String(req.adminAccount.id), standardHeaders: 'draft-7', legacyHeaders: false }));
  const owner = (req, res, next) => req.adminAccount.account_role === 'owner' ? next() : res.status(403).json({ error: 'Only the owner can manage admin accounts.' });
  async function confirmPassword(req, res) {
    const password = req.body.current_password;
    const rows = await query('SELECT password, password_version FROM users WHERE id = ?', [req.adminAccount.id]);
    if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72 || !rows[0] || !(await bcrypt.compare(password, rows[0].password))) {
      res.status(403).json({ error: 'Your current password is incorrect.' });
      return false;
    }
    return true;
  }
  function validPassword(value) {
    return typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72;
  }
  router.get('/me', (req, res) => res.json({ id: req.adminAccount.id, username: req.adminAccount.username, role: req.adminAccount.account_role }));
  router.get('/', owner, run(async (req, res) => {
    res.json(await query('SELECT id, username, account_role, is_active FROM users ORDER BY id'));
  }));
  router.post('/password', run(async (req, res) => {
    const password = req.body.new_password;
    if (!validPassword(password)) return res.status(400).json({ error: 'Use at least 12 characters (maximum 72 UTF-8 bytes).' });
    if (!(await confirmPassword(req, res))) return;
    if (password === req.body.current_password) return res.status(400).json({ error: 'Choose a different password.' });
    const hash = await bcrypt.hash(password, 12);
    const result = await query('UPDATE users SET password = ?, password_version = password_version + 1 WHERE id = ? AND password_version = ? AND is_active = 1', [hash, req.adminAccount.id, req.adminAccount.password_version]);
    if (!result.affectedRows) return res.status(409).json({ error: 'Account changed. Sign in again.' });
    req.session.destroy(() => res.json({ success: true, sign_in_required: true }));
  }));
  router.post('/', owner, run(async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Username must contain 3–32 letters, numbers, dots, underscores or hyphens.' });
    if (!validPassword(req.body.password)) return res.status(400).json({ error: 'Use a password of at least 12 characters (maximum 72 UTF-8 bytes).' });
    if (!(await confirmPassword(req, res))) return;
    const hash = await bcrypt.hash(req.body.password, 12);
    const connection = await db.promise().getConnection();
    let locked = false;
    try {
      const [lock] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', ['seventhcar:admin-users']);
      locked = Number(lock[0]?.acquired) === 1;
      if (!locked) return res.status(503).json({ error: 'Account creation busy. Please retry.' });
      const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length) return res.status(409).json({ error: 'That username already exists.' });
      await connection.query("INSERT INTO users (username, password, account_role, is_active, password_version) VALUES (?, ?, 'admin', 1, 0)", [username, hash]);
      res.status(201).json({ success: true });
    } finally {
      try { if (locked) await connection.query('SELECT RELEASE_LOCK(?)', ['seventhcar:admin-users']); }
      finally { connection.release(); }
    }
  }));
  router.post('/:id/status', owner, run(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1 || typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Invalid account or status.' });
    if (id === Number(req.adminAccount.id)) return res.status(400).json({ error: 'You cannot disable your own account.' });
    if (!(await confirmPassword(req, res))) return;
    const result = await query("UPDATE users SET is_active = ?, password_version = password_version + 1 WHERE id = ? AND account_role = 'admin'", [req.body.active ? 1 : 0, id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Admin account not found. Owner accounts cannot be disabled here.' });
    res.json({ success: true });
  }));
  return router;
}
module.exports = { createAccountRouter, validateSession };
