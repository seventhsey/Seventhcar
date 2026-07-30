const crypto = require("crypto");
const os = require("os");
const tls = require("tls");

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;
const SMTP_TIMEOUT_MS = 20000;

function cleanHeaderValue(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanHeaderValue(value));
}

function getEmailConfig() {
  const user = cleanHeaderValue(process.env.EMAIL_USER).toLowerCase();
  const appPassword = String(process.env.EMAIL_APP_PASSWORD || "")
    .replace(/\s+/g, "")
    .trim();
  const businessRecipients = String(
    process.env.EMAIL_BUSINESS_RECIPIENT || user
  )
    .split(",")
    .map((item) => cleanHeaderValue(item).toLowerCase())
    .filter(isValidEmail);

  return {
    user,
    appPassword,
    businessRecipients,
    fromName:
      cleanHeaderValue(process.env.EMAIL_FROM_NAME) ||
      "Seventh Seychelles Car Rental",
    replyTo:
      cleanHeaderValue(process.env.EMAIL_REPLY_TO).toLowerCase() || user,
    frontendUrl: String(process.env.FRONTEND_URL || "").replace(/\/$/, ""),
    companyPhone:
      cleanHeaderValue(process.env.COMPANY_PHONE) || "+248 2502815",
  };
}

function isEmailConfigured() {
  const config = getEmailConfig();
  return isValidEmail(config.user) && config.appPassword.length >= 16;
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
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return cleanHeaderValue(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTime(value) {
  return cleanHeaderValue(value).slice(0, 5) || "—";
}

function wrapBase64(value) {
  return Buffer.from(String(value), "utf8")
    .toString("base64")
    .match(/.{1,76}/g)
    .join("\r\n");
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(cleanHeaderValue(value), "utf8").toString(
    "base64"
  )}?=`;
}

function createMimeMessage({ from, fromName, to, replyTo, subject, text, html }) {
  const boundary = `----=_SeventhCar_${crypto.randomBytes(12).toString("hex")}`;
  const messageIdDomain = from.split("@")[1] || "localhost";
  const recipients = Array.isArray(to) ? to : [to];

  return [
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${messageIdDomain}>`,
    `From: ${encodeHeader(fromName)} <${from}>`,
    `To: ${recipients.join(", ")}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

class SmtpClient {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.pending = [];
    this.responses = [];
    this.currentResponse = null;
    this.closed = false;

    socket.on("data", (chunk) => this.handleData(chunk));
    socket.on("error", (error) => this.rejectPending(error));
    socket.on("close", () => {
      this.closed = true;
      this.rejectPending(new Error("SMTP connection closed unexpectedly."));
    });
  }

  handleData(chunk) {
    this.buffer += chunk.toString("utf8");

    while (this.buffer.includes("\n")) {
      const newlineIndex = this.buffer.indexOf("\n");
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newlineIndex + 1);

      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;

      const code = Number(match[1]);
      const separator = match[2];

      if (!this.currentResponse) {
        this.currentResponse = { code, lines: [] };
      }

      this.currentResponse.lines.push(line);

      if (separator === " ") {
        const response = this.currentResponse;
        this.currentResponse = null;
        this.deliverResponse(response);
      }
    }
  }

  deliverResponse(response) {
    const waiter = this.pending.shift();
    if (waiter) waiter.resolve(response);
    else this.responses.push(response);
  }

  rejectPending(error) {
    while (this.pending.length) {
      this.pending.shift().reject(error);
    }
  }

  nextResponse() {
    if (this.responses.length) {
      return Promise.resolve(this.responses.shift());
    }

    if (this.closed) {
      return Promise.reject(new Error("SMTP connection is closed."));
    }

    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
    });
  }

  async expect(expectedCodes, command) {
    const responsePromise = this.nextResponse();
    if (command !== undefined) {
      this.socket.write(`${command}\r\n`);
    }

    const response = await responsePromise;
    if (!expectedCodes.includes(response.code)) {
      throw new Error(
        `SMTP ${response.code}: ${response.lines.join(" ").slice(0, 500)}`
      );
    }
    return response;
  }

  async sendData(message) {
    const responsePromise = this.nextResponse();
    const dotStuffed = message.replace(/\r\n\./g, "\r\n..");
    this.socket.write(`${dotStuffed}\r\n.\r\n`);
    const response = await responsePromise;

    if (response.code !== 250) {
      throw new Error(
        `SMTP ${response.code}: ${response.lines.join(" ").slice(0, 500)}`
      );
    }
  }

  close() {
    if (!this.socket.destroyed) this.socket.end();
  }
}

async function connectToGmail() {
  const socket = tls.connect({
    host: SMTP_HOST,
    port: SMTP_PORT,
    servername: SMTP_HOST,
    rejectUnauthorized: true,
  });

  socket.setTimeout(SMTP_TIMEOUT_MS, () => {
    socket.destroy(new Error("Gmail SMTP connection timed out."));
  });

  const client = new SmtpClient(socket);

  await new Promise((resolve, reject) => {
    const handleSecureConnect = () => {
      cleanup();
      resolve();
    };
    const handleError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("secureConnect", handleSecureConnect);
      socket.off("error", handleError);
    };

    socket.once("secureConnect", handleSecureConnect);
    socket.once("error", handleError);
  });

  await client.expect([220]);
  return client;
}

async function sendGmailMessage({ to, subject, text, html }) {
  const config = getEmailConfig();
  const recipients = (Array.isArray(to) ? to : [to])
    .map((item) => cleanHeaderValue(item).toLowerCase())
    .filter(isValidEmail);

  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD."
    );
  }
  if (!recipients.length) {
    throw new Error("No valid email recipient was provided.");
  }

  const client = await connectToGmail();

  try {
    await client.expect([250], `EHLO ${os.hostname() || "localhost"}`);
    await client.expect([334], "AUTH LOGIN");
    await client.expect([334], Buffer.from(config.user).toString("base64"));
    await client.expect(
      [235],
      Buffer.from(config.appPassword).toString("base64")
    );
    await client.expect([250], `MAIL FROM:<${config.user}>`);

    for (const recipient of recipients) {
      await client.expect([250, 251], `RCPT TO:<${recipient}>`);
    }

    await client.expect([354], "DATA");
    await client.sendData(
      createMimeMessage({
        from: config.user,
        fromName: config.fromName,
        to: recipients,
        replyTo: config.replyTo,
        subject,
        text,
        html,
      })
    );

    try {
      await client.expect([221], "QUIT");
    } catch {
      // The email was already accepted. QUIT failures do not change delivery.
    }
  } finally {
    client.close();
  }
}

function buildExtrasRows(quote) {
  if (!quote?.extras?.length) {
    return '<tr><td colspan="2" style="padding:12px;color:#667085;">No extras selected</td></tr>';
  }

  return quote.extras
    .map(
      (extra) => `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #eaecf0;">
            ${escapeHtml(extra.name)}${
              Number(extra.quantity) > 1
                ? ` × ${Number(extra.quantity)}`
                : ""
            }
            <div style="font-size:12px;color:#667085;">
              ${
                extra.charge_type === "once"
                  ? "One-time charge"
                  : `${Number(extra.charged_days)} charged day(s)`
              }
            </div>
          </td>
          <td style="padding:10px 12px;border-top:1px solid #eaecf0;text-align:right;font-weight:600;">
            ${formatMoney(extra.total)}
          </td>
        </tr>`
    )
    .join("");
}

function buildCustomerEmail({ reservationId, reservation, quote }) {
  const config = getEmailConfig();
  const firstName = cleanHeaderValue(reservation.customer_name).split(/\s+/)[0];
  const manageUrl = config.frontendUrl
    ? `${config.frontendUrl}/manage-reservation`
    : "";
  const pickupLocation = cleanHeaderValue(reservation.pickup_location);
  const dropoffLocation = cleanHeaderValue(reservation.dropoff_location);

  const text = [
    `Hello ${firstName || "there"},`,
    "",
    "We have received your reservation request.",
    `Reference: #${reservationId}`,
    `Vehicle: ${quote?.vehicle?.name || "Selected vehicle"}`,
    `Pickup: ${formatDate(reservation.start_date)} at ${formatTime(
      reservation.start_time
    )}${pickupLocation ? ` — ${pickupLocation}` : ""}`,
    `Return: ${formatDate(reservation.end_date)} at ${formatTime(
      reservation.end_time
    )}${dropoffLocation ? ` — ${dropoffLocation}` : ""}`,
    `Charged days: ${Number(quote?.day_count || 0)}`,
    `Total: ${formatMoney(quote?.total)}`,
    "Payment: Pay on arrival",
    "",
    "Your reservation is currently pending. Our team will contact you to confirm the final arrangements.",
    manageUrl ? `Manage reservation: ${manageUrl}` : "",
    "",
    `Contact: ${config.replyTo} | ${config.companyPhone}`,
    "Seventh Seychelles Car Rental",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#101828;">
    <div style="max-width:680px;margin:0 auto;padding:28px 14px;">
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(16,24,40,.08);">
        <div style="background:linear-gradient(135deg,#1c78ec,#1cb4ec);padding:28px 32px;color:white;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.9;">Seventh Seychelles Car Rental</div>
          <h1 style="margin:10px 0 0;font-size:28px;">Reservation request received</h1>
        </div>
        <div style="padding:30px 32px;">
          <p style="margin-top:0;font-size:16px;line-height:1.6;">Hello ${escapeHtml(
            firstName || "there"
          )},</p>
          <p style="font-size:15px;line-height:1.65;color:#475467;">Thank you for choosing us. We have received your booking request and will contact you shortly to confirm the final arrangements.</p>

          <div style="background:#f0f7ff;border:1px solid #cfe5ff;border-radius:14px;padding:18px 20px;margin:24px 0;">
            <div style="font-size:13px;color:#475467;">Reservation reference</div>
            <div style="font-size:26px;font-weight:700;color:#1570ef;margin-top:3px;">#${escapeHtml(
              reservationId
            )}</div>
            <div style="display:inline-block;margin-top:10px;padding:5px 10px;border-radius:999px;background:#fff4e5;color:#b54708;font-size:12px;font-weight:700;">PENDING CONFIRMATION</div>
          </div>

          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:9px 0;color:#667085;width:38%;">Vehicle</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(
              quote?.vehicle?.name || "Selected vehicle"
            )}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Pickup</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(
              formatDate(reservation.start_date)
            )} at ${escapeHtml(formatTime(reservation.start_time))}${
              pickupLocation ? ` — ${escapeHtml(pickupLocation)}` : ""
            }</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Return</td><td style="padding:9px 0;font-weight:600;">${escapeHtml(
              formatDate(reservation.end_date)
            )} at ${escapeHtml(formatTime(reservation.end_time))}${
              dropoffLocation ? ` — ${escapeHtml(dropoffLocation)}` : ""
            }</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Charged days</td><td style="padding:9px 0;font-weight:600;">${Number(
              quote?.day_count || 0
            )}</td></tr>
            <tr><td style="padding:9px 0;color:#667085;">Payment</td><td style="padding:9px 0;font-weight:600;">Pay on arrival</td></tr>
          </table>

          <h2 style="font-size:17px;margin:28px 0 10px;">Price breakdown</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #eaecf0;border-radius:12px;overflow:hidden;font-size:14px;">
            <tr><td style="padding:12px;">Vehicle rental</td><td style="padding:12px;text-align:right;font-weight:600;">${formatMoney(
              quote?.vehicle?.total
            )}</td></tr>
            ${buildExtrasRows(quote)}
            <tr style="background:#f9fafb;"><td style="padding:14px 12px;border-top:2px solid #d0d5dd;font-weight:700;">Total</td><td style="padding:14px 12px;border-top:2px solid #d0d5dd;text-align:right;font-size:18px;font-weight:800;color:#1570ef;">${formatMoney(
              quote?.total
            )}</td></tr>
          </table>

          ${
            manageUrl
              ? `<div style="text-align:center;margin:28px 0 8px;"><a href="${escapeHtml(
                  manageUrl
                )}" style="display:inline-block;background:#1570ef;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px;">Manage reservation</a></div>`
              : ""
          }

          <p style="font-size:13px;line-height:1.6;color:#667085;margin:26px 0 0;">Questions? Reply to this email or contact us at ${escapeHtml(
            config.companyPhone
          )}.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject: `Reservation received — #${reservationId}`,
    text,
    html,
  };
}

function buildBusinessEmail({ reservationId, reservation, quote }) {
  const config = getEmailConfig();
  const pickupLocation = cleanHeaderValue(reservation.pickup_location);
  const dropoffLocation = cleanHeaderValue(reservation.dropoff_location);
  const notes = cleanHeaderValue(reservation.notes);
  const flightNumber = cleanHeaderValue(reservation.flight_number);

  const text = [
    `New reservation #${reservationId}`,
    "",
    `Customer: ${cleanHeaderValue(reservation.customer_name)}`,
    `Email: ${cleanHeaderValue(reservation.customer_email)}`,
    `Phone: ${cleanHeaderValue(reservation.customer_phone)}`,
    flightNumber ? `Flight: ${flightNumber}` : "",
    `Vehicle: ${quote?.vehicle?.name || "Selected vehicle"} (${cleanHeaderValue(
      reservation.plate_number
    )})`,
    `Pickup: ${formatDate(reservation.start_date)} at ${formatTime(
      reservation.start_time
    )}${pickupLocation ? ` — ${pickupLocation}` : ""}`,
    `Return: ${formatDate(reservation.end_date)} at ${formatTime(
      reservation.end_time
    )}${dropoffLocation ? ` — ${dropoffLocation}` : ""}`,
    `Total: ${formatMoney(quote?.total)}`,
    notes ? `Notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const extras = quote?.extras?.length
    ? quote.extras
        .map(
          (extra) =>
            `<li style="margin-bottom:6px;">${escapeHtml(extra.name)} × ${Number(
              extra.quantity
            )} — ${formatMoney(extra.total)}</li>`
        )
        .join("")
    : "<li>No extras selected</li>";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,sans-serif;color:#101828;">
    <div style="max-width:720px;margin:auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 30px rgba(16,24,40,.08);">
      <h1 style="margin:0 0 6px;font-size:26px;color:#1570ef;">New reservation #${escapeHtml(
        reservationId
      )}</h1>
      <p style="margin:0 0 24px;color:#667085;">A new pending booking was submitted through the website.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;color:#667085;width:34%;">Customer</td><td style="padding:8px;font-weight:600;">${escapeHtml(
          reservation.customer_name
        )}</td></tr>
        <tr><td style="padding:8px;color:#667085;">Email</td><td style="padding:8px;"><a href="mailto:${escapeHtml(
          reservation.customer_email
        )}">${escapeHtml(reservation.customer_email)}</a></td></tr>
        <tr><td style="padding:8px;color:#667085;">Phone</td><td style="padding:8px;">${escapeHtml(
          reservation.customer_phone
        )}</td></tr>
        ${
          flightNumber
            ? `<tr><td style="padding:8px;color:#667085;">Flight</td><td style="padding:8px;">${escapeHtml(
                flightNumber
              )}</td></tr>`
            : ""
        }
        <tr><td style="padding:8px;color:#667085;">Vehicle</td><td style="padding:8px;font-weight:600;">${escapeHtml(
          quote?.vehicle?.name || "Selected vehicle"
        )} — ${escapeHtml(reservation.plate_number)}</td></tr>
        <tr><td style="padding:8px;color:#667085;">Pickup</td><td style="padding:8px;">${escapeHtml(
          formatDate(reservation.start_date)
        )} at ${escapeHtml(formatTime(reservation.start_time))}${
          pickupLocation ? ` — ${escapeHtml(pickupLocation)}` : ""
        }</td></tr>
        <tr><td style="padding:8px;color:#667085;">Return</td><td style="padding:8px;">${escapeHtml(
          formatDate(reservation.end_date)
        )} at ${escapeHtml(formatTime(reservation.end_time))}${
          dropoffLocation ? ` — ${escapeHtml(dropoffLocation)}` : ""
        }</td></tr>
        <tr><td style="padding:8px;color:#667085;">Total</td><td style="padding:8px;font-size:20px;font-weight:800;color:#1570ef;">${formatMoney(
          quote?.total
        )}</td></tr>
      </table>
      <h2 style="font-size:17px;margin:24px 0 8px;">Extras</h2>
      <ul style="margin-top:0;padding-left:20px;color:#344054;">${extras}</ul>
      ${
        notes
          ? `<h2 style="font-size:17px;margin:24px 0 8px;">Customer notes</h2><div style="background:#f9fafb;border-radius:10px;padding:14px;white-space:pre-wrap;">${escapeHtml(
              notes
            )}</div>`
          : ""
      }
      ${
        config.frontendUrl
          ? `<p style="margin-top:26px;"><a href="${escapeHtml(
              config.frontendUrl
            )}" style="color:#1570ef;font-weight:700;">Open website</a></p>`
          : ""
      }
    </div>
  </body>
</html>`;

  return {
    subject: `New website reservation #${reservationId} — ${cleanHeaderValue(
      reservation.customer_name
    )}`,
    text,
    html,
  };
}

async function sendReservationEmails({ reservationId, reservation, quote }) {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      customerSent: false,
      businessSent: false,
      errors: ["EMAIL_USER or EMAIL_APP_PASSWORD is missing."],
    };
  }

  const config = getEmailConfig();
  const errors = [];
  let customerSent = false;
  let businessSent = false;

  try {
    const customerEmail = buildCustomerEmail({
      reservationId,
      reservation,
      quote,
    });
    await sendGmailMessage({
      to: reservation.customer_email,
      ...customerEmail,
    });
    customerSent = true;
  } catch (error) {
    errors.push(`Customer email: ${error.message}`);
  }

  try {
    const businessEmail = buildBusinessEmail({
      reservationId,
      reservation,
      quote,
    });
    await sendGmailMessage({
      to: config.businessRecipients,
      ...businessEmail,
    });
    businessSent = true;
  } catch (error) {
    errors.push(`Business email: ${error.message}`);
  }

  return {
    configured: true,
    customerSent,
    businessSent,
    errors,
  };
}

async function sendTestEmail() {
  const config = getEmailConfig();
  await sendGmailMessage({
    to: config.businessRecipients,
    subject: "Seventh Car email test successful",
    text:
      "Your Gmail SMTP configuration is working. Website reservation emails are ready to send.",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;">
        <h1 style="color:#1570ef;">Email setup is working</h1>
        <p>Your Gmail SMTP configuration is valid.</p>
        <p>The website is ready to send customer confirmations and business booking notifications.</p>
      </div>`,
  });
}

module.exports = {
  getEmailConfig,
  isEmailConfigured,
  sendGmailMessage,
  sendReservationEmails,
  sendTestEmail,
};
