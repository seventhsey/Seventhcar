const {
  PricingError,
  calculateReservationQuote,
} = require("../services/pricingService");

module.exports = function validateReservationPricing(db) {
  return async function reservationPricingGuard(req, res, next) {
    const isCreate = req.method === "POST" && req.path === "/";
    const isUpdate = req.method === "PUT" && /^\/\d+$/.test(req.path);

    if (!isCreate && !isUpdate) return next();

    try {
      const result = await calculateReservationQuote(db, req.body || {});
      const payload = req.body || {};
      const excludedReservationId = isUpdate
        ? Number(req.path.slice(1))
        : 0;

      // Availability is checked again on the server immediately before saving.
      // Frontend availability results are informational and are never trusted.
      const [conflicts] = await db.promise().query(
        `SELECT id
           FROM reservations
          WHERE plate_number = ?
            AND id <> ?
            AND status IN ('Pending', 'Approved')
            AND TIMESTAMP(start_date, start_time) < TIMESTAMP(?, ?)
            AND TIMESTAMP(end_date, end_time) > TIMESTAMP(?, ?)
          LIMIT 1`,
        [
          payload.plate_number,
          excludedReservationId,
          payload.end_date,
          String(payload.end_time || "").slice(0, 5),
          payload.start_date,
          String(payload.start_time || "").slice(0, 5),
        ]
      );

      if (conflicts.length) {
        throw new PricingError(
          "The selected vehicle is no longer available for these dates and times.",
          409
        );
      }

      // Never trust browser-calculated prices. Replace them with values built
      // from the database immediately before the reservation is stored.
      req.body.extras = result.normalizedExtras;
      req.body.total_price = result.quote.total;
      req.calculatedQuote = result.quote;

      // Existing reservation routes return their own success object. Enrich
      // that response with the exact quote used for the database write.
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (body && body.success) {
          return originalJson({
            ...body,
            total: result.quote.total,
            quote: result.quote,
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      if (!(error instanceof PricingError)) {
        console.error("Reservation pricing validation failed:", error);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Could not validate the reservation price.",
      });
    }
  };
};
