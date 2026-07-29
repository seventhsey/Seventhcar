const express = require("express");
const {
  PricingError,
  calculateReservationQuote,
} = require("../services/pricingService");

module.exports = (db) => {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      const result = await calculateReservationQuote(db, req.body || {});
      return res.json({ success: true, quote: result.quote });
    } catch (error) {
      if (!(error instanceof PricingError)) {
        console.error("Quote endpoint failed:", error);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Could not calculate the reservation price.",
      });
    }
  });

  return router;
};
