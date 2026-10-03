// Return actionable admin diagnostics without exposing credentials, customer
// addresses, SQL errors, or raw SMTP responses in an API response.
function describeEmailDeliveryError(error) {
  const message = String(error?.message || '');
  const code = String(error?.code || '');
  if (/SMTP 53[45]|authentication|credentials/i.test(message)) {
    return { code: 'SMTP_AUTH_FAILED', message: 'Gmail rejected the login. Check EMAIL_USER and EMAIL_APP_PASSWORD on the backend Railway service. Use a Gmail app password, then retry.' };
  }
  if (/no customer email|no valid email recipient/i.test(message)) {
    return { code: 'RECIPIENT_MISSING', message: 'This reservation has no valid customer email address. Edit the reservation email, then retry.' };
  }
  if (/timed? out|timeout|connection.*closed/i.test(message) || ['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH'].includes(code)) {
    return { code: 'SMTP_CONNECTION_FAILED', message: 'The backend could not connect to Gmail SMTP. Railway Free, Trial and Hobby plans block SMTP: use an HTTPS email provider or Railway Pro. If on Pro, check outbound connectivity and retry.' };
  }
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return { code: 'SMTP_DNS_FAILED', message: 'The backend could not resolve smtp.gmail.com. Check Railway network/DNS logs, then retry.' };
  }
  if (/SMTP 5\d\d/.test(message)) {
    return { code: 'SMTP_REJECTED', message: 'Gmail rejected the recipient or message. Check the customer email and the backend deployment logs for the SMTP response before retrying.' };
  }
  return { code: 'EMAIL_SEND_FAILED', message: 'The email could not be sent. In Railway open the backend service, its active deployment, then Deploy Logs; search for this reservation number and retry after fixing the cause.' };
}

module.exports = { describeEmailDeliveryError };
