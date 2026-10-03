const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const cancellation = require('../services/cancelledReservationEmail');
const confirmationPath = require.resolve('../services/confirmedReservationEmail');
const cancellationPath = require.resolve('../services/cancelledReservationEmail');
let row, calls, emails, delivery, failWrite;
require.cache[cancellationPath].exports = {
  ...cancellation,
  sendCancelledReservationEmail: async () => {
    assert.ok(calls.includes('commit'), 'Commit before sending email');
    assert.ok(calls.includes('release'), 'Release database connection before SMTP');
    emails.push({ status: row.status, reason: row.cancellation_reason });
    if (delivery instanceof Error) throw delivery;
    return delivery;
  },
};
require.cache[confirmationPath] = { id: confirmationPath, filename: confirmationPath, loaded: true,
  exports: { sendConfirmedReservationEmail: async () => { emails.push('approved'); return delivery; } } };
const connection = {
  beginTransaction: async () => calls.push('begin'),
  commit: async () => calls.push('commit'),
  rollback: async () => calls.push('rollback'),
  release: () => calls.push('release'),
  query: async (sql, params) => {
    calls.push(sql);
    if (sql.startsWith('SELECT')) return [[{ ...row }]];
    if (failWrite) throw new Error('database failure');
    if (sql.startsWith('UPDATE')) {
      row.status = params[0];
      row.cancellation_reason = sql.includes('cancellation_reason = ?') ? params[1] : null;
      return [{}];
    }
    throw new Error('Unexpected query, including any extras mutation');
  },
};
const db = { promise: () => ({ getConnection: async () => connection }) };
const router = require('../routes/reservations')(db);
const app = express();
app.use(express.json());
app.use((req, res, next) => { req.session = { userId: 1 }; next(); });
app.use('/api/reservations', router);
beforeEach(() => {
  row = { id: 12, status: 'Pending' }; calls = []; emails = [];
  delivery = { configured: true, sent: true }; failWrite = false;
});
const change = body => request(app).patch('/api/reservations/12/status').send(body);

test('cancellation requires a nonblank customer reason before any write', async () => {
  const response = await change({ status: 'Cancelled', cancellation_reason: '  ' });
  assert.equal(response.status, 400); assert.deepEqual(calls, []); assert.deepEqual(emails, []);
});
test('overlong cancellation reason is rejected', async () => {
  assert.equal((await change({ status: 'Cancelled', cancellation_reason: 'x'.repeat(2001) })).status, 400);
});
test('reason is stored and committed before sending; extras are untouched', async () => {
  const response = await change({ status: 'Cancelled', cancellation_reason: ' Car broken down. ' });
  assert.equal(response.status, 200); assert.equal(response.body.emailSent, true);
  assert.equal(row.cancellation_reason, 'Car broken down.');
  assert.ok(calls.includes('commit')); assert.ok(calls.includes('release'));
  assert.deepEqual(emails, [{ status: 'Cancelled', reason: 'Car broken down.' }]);
});
test('approved booking can be cancelled with its customer reason', async () => {
  row.status = 'Approved';
  const response = await change({ status: 'Cancelled', cancellation_reason: 'No replacement available.' });
  assert.equal(response.body.previousStatus, 'Approved'); assert.equal(response.body.emailSent, true);
});
test('repeated approval/cancellation does not send duplicate emails', async () => {
  row.status = 'Approved';
  assert.equal((await change({ status: 'Approved' })).body.unchanged, true);
  row.status = 'Cancelled';
  assert.equal((await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' })).body.unchanged, true);
  assert.deepEqual(emails, []);
});
test('explicit retry resends cancellation with the supplied reason', async () => {
  row.status = 'Cancelled';
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.', resendEmail: true });
  assert.equal(response.body.emailSent, true); assert.equal(emails.length, 1);
});
test('missing configuration is reported while cancellation remains saved', async () => {
  delivery = { configured: false, sent: false };
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(row.status, 'Cancelled'); assert.equal(response.body.emailConfigured, false);
  assert.equal(response.body.emailSent, false);
});
test('SMTP failure reports undelivered email without losing saved cancellation', async () => {
  delivery = new Error('SMTP failure');
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(row.status, 'Cancelled'); assert.equal(response.body.emailSent, false);
  assert.match(response.body.emailError, /retry/);
});
test('SMTP timeout gives actionable diagnostics and keeps cancellation saved', async () => {
  delivery = new Error('Gmail SMTP connection timed out.');
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(row.status, 'Cancelled');
  assert.equal(response.body.emailErrorCode, 'SMTP_CONNECTION_FAILED');
  assert.match(response.body.emailError, /Hobby plans block SMTP/);
});
test('SMTP auth diagnostics do not expose provider response or credentials', async () => {
  delivery = new Error('SMTP 535: credentials rejected SECRET_PASSWORD customer@example.com');
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(response.body.emailErrorCode, 'SMTP_AUTH_FAILED');
  assert.match(response.body.emailError, /app password/);
  assert.ok(!response.body.emailError.includes('SECRET_PASSWORD'));
  assert.ok(!response.body.emailError.includes('customer@example.com'));
});
test('missing customer email explains how to repair reservation', async () => {
  delivery = new Error('Reservation has no customer email address.');
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(response.body.emailErrorCode, 'RECIPIENT_MISSING');
  assert.match(response.body.emailError, /Edit the reservation email/);
});
test('write failure rolls back and never emails', async () => {
  failWrite = true;
  const response = await change({ status: 'Cancelled', cancellation_reason: 'Unavailable.' });
  assert.equal(response.status, 500); assert.ok(calls.includes('rollback')); assert.deepEqual(emails, []);
});
test('full edit cannot silently bypass customer cancellation notification', async () => {
  const response = await request(app).put('/api/reservations/12').send({ status: 'Cancelled' });
  assert.equal(response.status, 400); assert.equal(row.status, 'Pending'); assert.deepEqual(emails, []);
});
test('cancellation template escapes the reason and excludes internal notes', () => {
  const message = cancellation.buildCancellationMessage({
    customer_name: 'Alex', cancellation_reason: 'Broken <car> & no replacement.\nSorry.',
    notes: 'PRIVATE INTERNAL NOTE', car_name: 'Small car', start_label: '2026-12-01',
    end_label: '2026-12-04', start_time: '12:00:00', end_time: '12:00:00',
  }, 12, { companyPhone: '+248 2502815' });
  assert.match(message.html, /Broken &lt;car&gt; &amp; no replacement/);
  assert.match(message.text, /Broken <car> & no replacement/);
  assert.ok(!message.text.includes('PRIVATE')); assert.ok(!message.html.includes('PRIVATE'));
  assert.match(message.subject, /#12/);
});
