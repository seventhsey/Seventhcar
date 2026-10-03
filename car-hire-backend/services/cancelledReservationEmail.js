const { getEmailConfig, isEmailConfigured, sendGmailMessage } = require("./emailService");

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function buildCancellationMessage(reservation, reservationId, config) {
  const reason = String(reservation.cancellation_reason || "").trim();
  if (!reason) throw new Error("A customer-facing cancellation reason is required.");
  const vehicle = reservation.car_name || reservation.plate_number;
  const dates = `${reservation.start_label} ${String(reservation.start_time || "").slice(0, 5)} → ${reservation.end_label} ${String(reservation.end_time || "").slice(0, 5)}`;
  const text = [
    `Hello ${reservation.customer_name || "there"},`,
    `We’re sorry, your reservation #${reservationId} has been cancelled.`,
    `Vehicle: ${vehicle}`, `Rental dates: ${dates}`, "Reason for cancellation:", reason,
    "If you have questions or would like to discuss other arrangements, please reply to this email.",
    `Seventh Seychelles Car Rental · ${config.companyPhone}`,
  ].join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#122b3a;line-height:1.6;">
    <p>Seventh Seychelles Car Rental</p><h1 style="font-size:26px;">Reservation cancelled</h1>
    <p>Hello ${escapeHtml(reservation.customer_name || "there")},</p>
    <p>We’re sorry, your reservation <strong>#${reservationId}</strong> has been cancelled.</p>
    <p><strong>Vehicle:</strong> ${escapeHtml(vehicle)}<br /><strong>Rental dates:</strong> ${escapeHtml(dates)}</p>
    <div style="background:#f2f7f8;border-left:4px solid #167a7c;padding:18px;"><strong>Reason for cancellation</strong>
      <p style="white-space:pre-wrap;">${escapeHtml(reason)}</p></div>
    <p>If you have questions or would like to discuss other arrangements, please reply to this email.</p>
    <p>Seventh Seychelles Car Rental<br />${escapeHtml(config.companyPhone)}</p></div>`;
  return { subject: `Reservation cancelled — #${reservationId}`, text, html };
}

async function sendCancelledReservationEmail(db, reservationId) {
  if (!isEmailConfigured()) return { configured: false, sent: false };
  const rows = await new Promise((resolve, reject) => db.query(
    `SELECT r.*, c.car_name, DATE_FORMAT(r.start_date, '%Y-%m-%d') AS start_label,
      DATE_FORMAT(r.end_date, '%Y-%m-%d') AS end_label
      FROM reservations r LEFT JOIN cars c ON c.plate_number = r.plate_number WHERE r.id = ?`,
    [reservationId], (error, result) => error ? reject(error) : resolve(result)
  ));
  const reservation = rows[0];
  if (!reservation || reservation.status !== "Cancelled") throw new Error("Reservation is not cancelled.");
  if (!reservation.customer_email) throw new Error("Reservation has no customer email address.");
  await sendGmailMessage({ to: reservation.customer_email,
    ...buildCancellationMessage(reservation, reservationId, getEmailConfig()) });
  return { configured: true, sent: true };
}

module.exports = { buildCancellationMessage, sendCancelledReservationEmail };
