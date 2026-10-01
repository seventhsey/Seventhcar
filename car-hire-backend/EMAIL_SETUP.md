# Gmail reservation email setup

The backend automatically sends two emails after a new reservation is saved:

1. A confirmation to the customer.
2. A new-booking notification to the business.

Email failure does not delete or reject a successfully saved reservation. Delivery problems are written to the backend logs.

## Required Gmail preparation

1. Turn on 2-Step Verification for the Google account.
2. Open Google Account → Security → App passwords.
3. Create an app password for the website/backend.
4. Copy the generated 16-character password.

Use the app password, not the normal Gmail account password.

## Local setup

Create `car-hire-backend/.env` using `.env.example` as the template.

Only these values are required for email:

```env
EMAIL_USER=seventhcar@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

The spaces in the app password are optional. The backend removes them automatically.

By default, the business notification is sent to `EMAIL_USER`. To use another address or multiple addresses:

```env
EMAIL_BUSINESS_RECIPIENT=bookings@example.com,owner@example.com
```

Optional customization:

```env
EMAIL_FROM_NAME=Seventh Seychelles Car Rental
EMAIL_REPLY_TO=seventhcar@gmail.com
COMPANY_PHONE=+248 2502815
FRONTEND_URL=http://localhost:3000
```

## Test locally

From `car-hire-backend` run:

```bash
npm run test:email
```

Expected output:

```text
Sending Gmail SMTP test from seventhcar@gmail.com...
Success. Test email sent to seventhcar@gmail.com.
```

## Railway setup

Open the backend Railway service and add these Variables:

```env
EMAIL_USER=seventhcar@gmail.com
EMAIL_APP_PASSWORD=the-generated-app-password
```

Optional Railway variables:

```env
EMAIL_BUSINESS_RECIPIENT=seventhcar@gmail.com
EMAIL_FROM_NAME=Seventh Seychelles Car Rental
EMAIL_REPLY_TO=seventhcar@gmail.com
COMPANY_PHONE=+248 2502815
```

Railway will redeploy after the variables are saved. Create one test reservation and check the backend deployment logs for either:

```text
Reservation #123 confirmation emails sent.
```

or a specific Gmail delivery error.

## Security

- Never commit `.env` or the app password.
- Do not use the normal Gmail password.
- Revoke the app password immediately if it is exposed.
- A Google account password change may revoke existing app passwords, requiring a new one.
