const { sendReservationEmails } = require("../services/emailService");

module.exports = function reservationEmailMiddleware(req, res, next) {
  const isCreateReservation = req.method === "POST" && req.path === "/";
  if (!isCreateReservation) return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const response = originalJson(body);

    if (body?.success && body?.reservationId) {
      const reservation = {
        ...req.body,
        total_price: req.calculatedQuote?.total ?? req.body.total_price,
      };

      setImmediate(async () => {
        try {
          const result = await sendReservationEmails({
            reservationId: body.reservationId,
            reservation,
            quote: req.calculatedQuote,
          });

          if (!result.configured) {
            console.warn(
              `Reservation #${body.reservationId} saved, but email is not configured.`
            );
            return;
          }

          if (result.errors.length) {
            console.error(
              `Reservation #${body.reservationId} email delivery problems:`,
              result.errors
            );
          } else {
            console.log(
              `Reservation #${body.reservationId} confirmation emails sent.`
            );
          }
        } catch (error) {
          console.error(
            `Reservation #${body.reservationId} email delivery failed:`,
            error
          );
        }
      });
    }

    return response;
  };

  next();
};
