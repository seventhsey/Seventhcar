const {
  getEmailConfig,
  isEmailConfigured,
  sendGmailMessage,
} = require("./emailService");

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value) {
  return `€${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTime(value) {
  return String(value || "").slice(0, 5) || "—";
}

function calculateBookingDays(startDate, startTime, endDate, endTime) {
  const start = new Date(`${String(startDate).slice(0, 10)}T00:00:00`);
  const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00`);
  let days = Math.floor((end - start) / 86400000) + 1;
  if (formatTime(endTime) > formatTime(startTime)) days += 1;
  return Math.max(1, days);
}

async function loadConfirmedEmailData(db, reservationId) {
  const reservations = await query(
    db,
    `SELECT r.*, c.car_name
       FROM reservations r
       LEFT JOIN cars c ON c.plate_number = r.plate_number
      WHERE r.id = ?`,
    [reservationId]
  );

  if (!reservations.length) {
    throw new Error("Reservation not found while preparing confirmation email.");
  }

  const reservation = reservations[0];
  const extras = await query(
    db,
    `SELECT
       re.extra_id,
       re.days,
       re.price_at_booking,
       e.name,
       e.charge_type,
       e.price AS current_price
     FROM reservation_extras re
     LEFT JOIN extras e ON e.id = re.extra_id
     WHERE re.reservation_id = ?`,
    [reservationId]
  );

  const lines = extras.map((extra) => {
    const bookedUnitTotal = Number(extra.price_at_booking || 0);
    const currentUnitPrice = Number(extra.current_price || 0);
    const ratio = currentUnitPrice > 0 ? bookedUnitTotal / currentUnitPrice : 1;
    const rounded = Math.round(ratio);
    const quantity =
      rounded >= 1 && rounded <= 3 && Math.abs(ratio - rounded) < 0.001
        ? rounded
        : 1;
    const chargedDays = Math.max(1, Number(extra.days || 1));

    return {
      name: extra.name || `Extra ${extra.extra_id}`,
      quantity,
      chargeType: extra.charge_type === "once" ? "once" : "daily",
      chargedDays,
      total: Number((bookedUnitTotal * chargedDays).toFixed(2)),
    };
  });

  const extrasTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const total = Number(reservation.total_price || 0);

  return {
    reservation,
    lines,
    total,
    vehicleTotal: Math.max(0, Number((total - extrasTotal).toFixed(2))),
    dayCount: calculateBookingDays(
      reservation.start_date,
      reservation.start_time,
      reservation.end_date,
      reservation.end_time
    ),
  };
}

async function sendConfirmedReservationEmail(db, reservationId) {
  if (!isEmailConfigured()) {
    return { configured: false, sent: false };
  }

  const config = getEmailConfig();
  const { reservation, lines, total, vehicleTotal, dayCount } =
    await loadConfirmedEmailData(db, reservationId);

  if (!reservation.customer_email) {
    throw new Error("Reservation has no customer email address.");
  }

  const firstName = String(reservation.customer_name || "")
    .trim()
    .split(/\s+/)[0] || "there";
  const manageUrl = config.frontendUrl
    ? `${config.frontendUrl}/manage-reservation`
    : "";

  const extrasText = lines.length
    ? lines
        .map(
          (line) =>
            `${line.name}${line.quantity > 1 ? ` × ${line.quantity}` : ""}: ${formatMoney(line.total)}`
        )
        .join("\n")
    : "No extras selected";

  const text = [
    `Hello ${firstName},`,
    "",
    "Your reservation has been confirmed.",
    `Reservation reference: #${reservationId}`,
    `Vehicle: ${reservation.car_name || reservation.plate_number}`,
    `Pickup: ${formatDate(reservation.start_date)} at ${formatTime(reservation.start_time)}`,
    `Return: ${formatDate(reservation.end_date)} at ${formatTime(reservation.end_time)}`,
    `Charged days: ${dayCount}`,
    "",
    extrasText,
    "",
    `Total: ${formatMoney(total)}`,
    "Payment: Pay on arrival",
    manageUrl ? `Manage reservation: ${manageUrl}` : "",
    "",
    `Questions? Reply to this email or contact us at ${config.companyPhone}.`,
    "Seventh Seychelles Car Rental",
  ]
    .filter(Boolean)
    .join("\n");

  const extrasHtml = lines.length
    ? lines
        .map(
          (line) => `
            <tr>
              <td style="padding:10px 12px;border-top:1px solid #eaecf0;">
                ${escapeHtml(line.name)}${line.quantity > 1 ? ` × ${line.quantity}` : ""}
                <div style="font-size:12px;color:#667085;">
                  ${line.chargeType === "once" ? "One-time charge" : `${line.chargedDays} charged day(s)`}
                </div>
              </td>
              <td style="padding:10px 12px;border-top:1px solid #eaecf0;text-align:right;font-weight:600;">
                ${formatMoney(line.total)}
              </td>
            </tr>`
        )
        .join("")
    : '<tr><td colspan="2" style="padding:12px;color:#667085;">No extras selected</td></tr>';

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#101828;">
    <div style="max-width:680px;margin:0 auto;padding:28px 14px;">
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(16,24,40,.08);">
        <div style="background:linear-gradient(135deg,#1c78ec,#1cb4ec);padding:28px 32px;color:white;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Seventh Seychelles Car Rental</div>
          <h1 style="margin:10px 0 0;font-size:28px;">Your reservation is confirmed</h1>
        </div>
        <div style="padding:30px 32px;">
          <p style="margin-top:0;font-size:16px;line-height:1.6;">Hello ${escapeHtml(firstName)},</p>
          <p style="font-size:15px;line-height:1.65;color:#475467;">Your booking has been reviewed and confirmed by our team. We look forward to seeing you in Seychelles.</p>

          <div style="background:#ecfdf3;border:1px solid #abefc6;border-radius:14px;padding:18px 20px;margin:24px 0;">
            <div style="font-size:13px;color:#475467;">Reservation reference</div>
            <div style="font-size:26px;font-weight:700;color:#067647;margin-top:3px;">#${escapeHtml(reservationId)}</div>
            <div style="display:inline-block;margin-top:10px;padding:5px 10px;border-radius:999px;background:#ffffff;color:#067647;font-size:12px;font-weight:700;">CONFIRMED</div>
          </div>

          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:9px 0;color:#667085;width:38%;">Vehicle</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(reservation.car_name || reservation.plate_number)}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Pickup</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(formatDate(reservation.start_date))} at ${escapeHtml(formatTime(reservation.start_time))}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Return</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(formatDate(reservation.end_date))} at ${escapeHtml(formatTime(reservation.end_time))}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Charged days</td><td style="padding:9px 0;font-weight:600;">${dayCount}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Payment</td><td style="padding:9px 0;font-weight:600;">Pay on arrival</td></tr>
          </table>

          <h2 style="font-size:17px;margin:28px 0 10px;">Price breakdown</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eaecf0;border-radius:12px;overflow:hidden;font-size:14px;">
            <tr><td style="padding:12px;">Vehicle rental</td><td style="padding:12px;text-align:right;font-weight:600;">${formatMoney(vehicleTotal)}</td></tr>
            ${extrasHtml}
            <tr style="background:#f9fafb;"><td style="padding:14px 12px;border-top:2px solid #d0d5dd;font-weight:700;">Total</td><td style="padding:14px 12px;border-top:2px solid #d0d5dd;text-align:right;font-size:18px;font-weight:800;color:#1570ef;">${formatMoney(total)}</td></tr>
          </table>

          ${
            manageUrl
              ? `<div style="text-align:center;margin:28px 0 8px;"><a href="${escapeHtml(manageUrl)}" style="display:inline-block;background:#1570ef;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;">Manage reservation</a></div>`
              : ""
          }

          <p style="font-size:13px;line-height:1.6;color:#667085;margin:26px 0 0;">Questions? Reply to this email or contact us at ${escapeHtml(config.companyPhone)}.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  await sendGmailMessage({
    to: reservation.customer_email,
    subject: `Reservation confirmed — #${reservationId}`,
    text,
    html,
  });

  return { configured: true, sent: true };
}

module.exports = { sendConfirmedReservationEmail };
