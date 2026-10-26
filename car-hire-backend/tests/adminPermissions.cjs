const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const guard = require('../middleware/adminPermissions');
const pricing = require('../middleware/validateReservationPricing');

function app(role = 'admin') {
  const app = express(); app.use(express.json());
  app.use((req, res, next) => { req.session = { userId: 2 }; req.adminAccount = { id: 2, account_role: role }; next(); });
  app.use(guard); app.use((req, res) => res.json({ success: true })); return app;
}
test('staff cannot delete anything or mutate cars/extras, including alternate URL case', async () => {
  const server = app();
  for (const path of ['/api/reservations/1', '/api/cars/S1', '/api/extras/4', '/api/car-unavailability/1']) await request(server).delete(path).expect(403);
  for (const path of ['/api/cars', '/api/extras', '/API/CARS', '/API/EXTRAS']) {
    await request(server).post(path).send({}).expect(403);
    await request(server).put(`${path}/1`).send({}).expect(403);
  }
});
test('staff can create/edit reservations, set statuses and change vehicle availability', async () => {
  const server = app();
  await request(server).post('/api/reservations').send({}).expect(200);
  await request(server).put('/api/reservations/1').send({}).expect(200);
  await request(server).patch('/api/reservations/1/status').send({ status: 'Cancelled' }).expect(200);
  await request(server).post('/api/car-unavailability').send({}).expect(200);
  await request(server).post('/api/car-unavailability/1/reactivate').send({}).expect(200);
  await request(server).post('/api/accounts/password').send({}).expect(200);
});
test('staff cannot set or remove manual price overrides; owner retains access', async () => {
  for (const body of [{ price_override: 1 }, { price_override: null }, { price_override_reason: '' }]) await request(app()).put('/api/reservations/1').send(body).expect(403);
  await request(app('owner')).put('/api/reservations/1').send({ price_override: 1 }).expect(200);
  await request(app('owner')).delete('/api/cars/S1').expect(200);
});
test('staff reservation edits preserve owner prices and cannot trust submitted totals', async () => {
  let override = 425;
  const rows = sql => {
    if (sql.includes('GET_LOCK')) return [{ acquired: 1 }];
    if (sql.includes('SELECT price_override')) return [{ price_override: override, price_override_reason: 'Agreed rate' }];
    if (sql.includes('FROM cars')) return [{ plate_number: 'S1', price: 50, car_name: 'Test' }];
    return [];
  };
  const conn = { query: async sql => [rows(sql)], release() {} };
  const db = { query(sql, params, cb) { cb(null, rows(sql)); }, promise: () => ({ ...conn, getConnection: async () => conn }) };
  const server = express(); server.use(express.json());
  server.use((req, res, next) => { req.session = { userId: 2 }; req.adminAccount = { account_role: 'admin' }; next(); });
  server.use(guard);
  server.use('/api/reservations', pricing(db), (req, res) => res.json({ success: true, saved: req.body }));
  const body = { plate_number: 'S1', start_date: '2027-01-01', start_time: '12:00', end_date: '2027-01-03', end_time: '12:00', extras: [], total_price: 1 };
  const preserved = await request(server).put('/api/reservations/1').send(body).expect(200);
  assert.equal(preserved.body.saved.total_price, 425); assert.equal(preserved.body.saved.price_override_reason, 'Agreed rate');
  override = null;
  const automatic = await request(server).put('/api/reservations/1').send(body).expect(200);
  assert.notEqual(automatic.body.saved.total_price, 1); assert.equal(automatic.body.saved.price_override, null);
});
test('reactivating a car updates its block without deleting data', async () => {
  const statements = [];
  const db = { promise: () => ({ query: async (sql, params) => { statements.push(sql); return [{ affectedRows: 1 }]; } }) };
  const actual = express(); actual.use(express.json());
  actual.use((req, res, next) => { req.session = { userId: 2 }; req.adminAccount = { account_role: 'admin' }; next(); });
  actual.use(guard); actual.use('/api/car-unavailability', require('../routes/carUnavailability')(db));
  await request(actual).post('/api/car-unavailability/1/reactivate').expect(200);
  assert(statements[0].startsWith('UPDATE car_unavailability SET cancelled_at'));
  await request(actual).delete('/api/car-unavailability/1').expect(403);
  assert.equal(statements.length, 1);
});
