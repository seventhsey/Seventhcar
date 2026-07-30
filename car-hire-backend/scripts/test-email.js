require("dotenv").config();

const {
  getEmailConfig,
  isEmailConfigured,
  sendTestEmail,
} = require("../services/emailService");

async function main() {
  const config = getEmailConfig();

  if (!isEmailConfigured()) {
    console.error("Email is not configured.");
    console.error("Set EMAIL_USER and EMAIL_APP_PASSWORD in car-hire-backend/.env.");
    process.exitCode = 1;
    return;
  }

  console.log(`Sending Gmail SMTP test from ${config.user}...`);
  await sendTestEmail();
  console.log(
    `Success. Test email sent to ${config.businessRecipients.join(", ")}.`
  );
}

main().catch((error) => {
  console.error("Email test failed:", error.message);
  process.exitCode = 1;
});
