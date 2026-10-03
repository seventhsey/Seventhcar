# Admin cancellation emails

From reservation details, Reject/Cancel opens the existing confirmation dialog with a required customer-facing reason (maximum 2000 characters). The server saves the Cancelled status and reason together, then emails the customer through the existing Gmail service. Internal notes are not included.

The reason remains visible in reservation details. Cancelled bookings offer Resend cancellation email, which lets the admin review the saved reason and explicitly resend. Repeated status requests do not resend unless requested. Email failures do not undo the cancellation: the admin sees Customer not notified and can retry from the saved booking.

General reservation editing cannot silently change an active booking to Cancelled. Use the dedicated Reject/Cancel action. A newly-created manual booking must be created as Pending before cancelling it.

## Deployment

The existing startup migration adds one nullable TEXT column: reservations.cancellation_reason. The Railway database user needs its existing ALTER permission. Gmail uses the existing EMAIL_USER and EMAIL_APP_PASSWORD backend variables; no new email credentials are required.

## Validation

Run npm run test:cancellation in car-hire-backend. Tests use mocked database/email delivery; actual Railway migration and Gmail delivery still require a test booking after deployment. No real customer emails are sent by the tests.
