const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const bcrypt = require('bcrypt');
const { createAccountRouter, validateSession } = require('../routes/accounts');

async function fixture() {
  const hash = await bcrypt.hash('original-testing-password', 4);
  const users = [
    { id: 1, username: 'owner', password: hash, account_role: 'owner', is_active: 1, password_version: 0 },
    { id: 2, username: 'staff', password: hash, account_role: 'admin', is_active: 1, password_version: 0 },
  ];
  let released = 0;
  async function query(sql, params) {
    if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
    if (sql.includes('RELEASE_LOCK')) { released++; return []; }
    if (sql.startsWith('SELECT id FROM users WHERE username')) return users.filter(u => u.username.toLowerCase() === params[0].toLowerCase()).map(u => ({ id: u.id }));
    if (sql.startsWith('SELECT') && sql.includes('WHERE id = ?')) return users.filter(u => u.id === Number(params[0])).map(u => ({ ...u }));
    if (sql.startsWith('SELECT')) return users.map(({ password, ...u }) => u);
    if (sql.startsWith('INSERT')) { users.push({ id: 3, username: params[0], password: params[1], account_role: 'admin', is_active: 1, password_version: 0 }); return { affectedRows: 1 }; }
    if (sql.startsWith('UPDATE users SET password')) {
      const u = users.find(u => u.id === params[1] && u.password_version === params[2] && u.is_active);
      if (!u) return { affectedRows: 0 }; u.password = params[0]; u.password_version++; return { affectedRows: 1 };
    }
    if (sql.startsWith('UPDATE users SET is_active')) {
      const u = users.find(u => u.id === params[1] && u.account_role === 'admin');
      if (!u) return { affectedRows: 0 }; u.is_active = params[0]; u.password_version++; return { affectedRows: 1 };
    }
    throw new Error(`Unhandled query: ${sql}`);
  }
  const connection = { query: async (sql, params) => [await query(sql, params)], release() {} };
  const db = { query(sql, params, cb) { query(sql, params).then(rows => cb(null, rows), cb); }, promise: () => ({ ...connection, getConnection: async () => connection }) };
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { req.session = { userId: Number(req.get('x-user')) || undefined, passwordVersion: Number(req.get('x-version') || 0), destroy(cb) { cb(); } }; next(); });
  app.use(validateSession(db)); app.use('/api/accounts', createAccountRouter(db));
  const post = (path, body, user = 1) => request(app).post(`/api/accounts${path}`).set('x-user', String(user)).send(body);
  return { users, app, post, released: () => released };
}

test('account APIs require login and owner-only administration; no password data returned', async () => {
  const f = await fixture();
  await request(f.app).get('/api/accounts/me').expect(401);
  await request(f.app).get('/api/accounts').set('x-user', '2').expect(403);
  const me = await request(f.app).get('/api/accounts/me').set('x-user', '2').expect(200);
  assert.equal(me.body.username, 'staff'); assert.equal(me.body.password, undefined);
  const list = await request(f.app).get('/api/accounts').set('x-user', '1').expect(200);
  assert(list.body.every(u => !u.password));
  await f.post('/', { username: 'newadmin', password: 'new-admin-passphrase', current_password: 'original-testing-password' }, 2).expect(403);
});

test('password changes require current password and a long new password; old sessions are revoked', async () => {
  const f = await fixture();
  await f.post('/password', { current_password: 'original-testing-password', new_password: 'short' }, 2).expect(400);
  await f.post('/password', { current_password: 'wrong', new_password: 'new-secure-passphrase' }, 2).expect(403);
  await f.post('/password', { current_password: 'original-testing-password', new_password: 'new-secure-passphrase' }, 2).expect(200);
  assert(await bcrypt.compare('new-secure-passphrase', f.users[1].password));
  assert.equal(await bcrypt.compare('original-testing-password', f.users[1].password), false);
  await request(f.app).get('/api/accounts/me').set('x-user', '2').expect(401);
  await request(f.app).get('/api/accounts/me').set('x-user', '2').set('x-version', '1').expect(200);
});

test('owner creates admins using hashed passwords; duplicates and invalid credentials are rejected', async () => {
  const f = await fixture();
  const body = { username: 'newadmin', password: 'new-admin-passphrase', current_password: 'original-testing-password' };
  await f.post('/', { ...body, current_password: 'wrong' }).expect(403);
  await f.post('/', { ...body, username: '<script>' }).expect(400);
  await f.post('/', body).expect(201);
  assert.equal(f.users[2].account_role, 'admin');
  assert.notEqual(f.users[2].password, body.password);
  assert(await bcrypt.compare(body.password, f.users[2].password));
  await f.post('/', { ...body, username: 'NEWADMIN' }).expect(409);
  assert.equal(f.released(), 2);
});

test('owner can disable/reactivate staff, cannot disable owner; previous sessions stay invalid', async () => {
  const f = await fixture();
  await f.post('/1/status', { active: false, current_password: 'original-testing-password' }).expect(400);
  await f.post('/2/status', { active: false, current_password: 'original-testing-password' }).expect(200);
  await request(f.app).get('/api/accounts/me').set('x-user', '2').expect(401);
  await f.post('/2/status', { active: true, current_password: 'original-testing-password' }).expect(200);
  await request(f.app).get('/api/accounts/me').set('x-user', '2').expect(401);
  await request(f.app).get('/api/accounts/me').set('x-user', '2').set('x-version', '2').expect(200);
});

test('account mutations reject foreign origins and non-JSON requests', async () => {
  const f = await fixture();
  await f.post('/password', { current_password: 'original-testing-password', new_password: 'new-secure-passphrase' }).set('Origin', 'https://evil.example').expect(403);
  await request(f.app).post('/api/accounts/password').set('x-user', '1').type('form').send({ current_password: 'original-testing-password' }).expect(403);
  assert.equal(f.users[0].password_version, 0);
});
