const SEAT_EXTRA_IDS = new Set([4, 5]);
const PROTECTION_EXTRA_IDS = new Set([1, 2, 3]);
const LOCATION_EXTRA_IDS = new Set([9, 10, 11]);

function calculateBookingDays(startDate, startTime, endDate, endTime) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  let days = Math.floor((end - start) / 86400000) + 1;
  if (endTime > startTime) days += 1;
  return Math.max(1, days);
}

function getTierMultiplier(days) {
  if (days === 1) return 1.5;
  if (days <= 3) return 1.25;
  if (days <= 6) return 1.11;
  if (days <= 10) return 1;
  if (days <= 14) return 0.9;
  if (days <= 21) return 0.8;
  return 0.7;
}

function getMaxQuantity(extra) {
  const id = Number(extra.id);
  const name = String(extra.name || "").toLowerCase();

  if (
    SEAT_EXTRA_IDS.has(id) ||
    name.includes("baby seat") ||
    name.includes("child seat")
  ) {
    return 3;
  }

  return 1;
}

module.exports = function validateReservationPricing(db) {
  return function reservationPricingGuard(req, res, next) {
    const isCreate = req.method === "POST" && req.path === "/";
    const isUpdate = req.method === "PUT" && /^\/\d+$/.test(req.path);
    if (!isCreate && !isUpdate) return next();

    const {
      plate_number,
      start_date,
      start_time,
      end_date,
      end_time,
    } = req.body || {};

    if (!plate_number || !start_date || !start_time || !end_date || !end_time) {
      return res.status(400).json({
        success: false,
        error: "Vehicle and reservation dates are required.",
      });
    }

    const dayCount = calculateBookingDays(start_date, start_time, end_date, end_time);
    if (!dayCount) {
      return res.status(400).json({ success: false, error: "Invalid reservation dates." });
    }

    const requestedExtras = Array.isArray(req.body.extras) ? req.body.extras : [];
    const requestedById = new Map();

    for (const item of requestedExtras) {
      const id = Number(item.extra_id ?? item.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, error: "Invalid extra selection." });
      }

      if (item.qty !== undefined) {
        const explicitQty = Number(item.qty);
        if (!Number.isInteger(explicitQty) || explicitQty < 1) {
          return res.status(400).json({ success: false, error: "Invalid extra quantity." });
        }
      }

      if (requestedById.has(id)) {
        return res.status(400).json({ success: false, error: "The same extra cannot be added twice." });
      }

      requestedById.set(id, item);
    }

    const ids = [...requestedById.keys()];
    const placeholders = ids.map(() => "?").join(",");
    const extrasSql = ids.length
      ? `SELECT id, name, price, charge_type FROM extras WHERE id IN (${placeholders})`
      : "SELECT id, name, price, charge_type FROM extras WHERE 1 = 0";

    db.query("SELECT price FROM cars WHERE plate_number = ?", [plate_number], (carErr, carRows) => {
      if (carErr) {
        console.error("Price validation car query failed:", carErr);
        return res.status(500).json({ success: false, error: "Could not validate vehicle price." });
      }

      if (!carRows.length) {
        return res.status(400).json({ success: false, error: "Selected vehicle does not exist." });
      }

      db.query(extrasSql, ids, (extrasErr, extraRows) => {
        if (extrasErr) {
          console.error("Price validation extras query failed:", extrasErr);
          return res.status(500).json({ success: false, error: "Could not validate extras." });
        }

        if (extraRows.length !== ids.length) {
          return res.status(400).json({ success: false, error: "One or more selected extras do not exist." });
        }

        const selectedProtection = extraRows.filter((extra) => PROTECTION_EXTRA_IDS.has(Number(extra.id)));
        if (selectedProtection.length > 1) {
          return res.status(400).json({ success: false, error: "Only one protection plan may be selected." });
        }

        const selectedLocations = new Set(
          extraRows.filter((extra) => LOCATION_EXTRA_IDS.has(Number(extra.id))).map((extra) => Number(extra.id))
        );
        if (selectedLocations.has(11) && (selectedLocations.has(9) || selectedLocations.has(10))) {
          return res.status(400).json({
            success: false,
            error: "Combined pickup/drop-off cannot be selected with individual location extras.",
          });
        }

        let extrasTotal = 0;
        const normalizedExtras = [];

        for (const extra of extraRows) {
          const id = Number(extra.id);
          const requested = requestedById.get(id) || {};
          const unitPrice = Number(extra.price || 0);

          let qty = Number(requested.qty);
          if (!Number.isInteger(qty) || qty < 1) {
            const submittedPrice = Number(requested.price_at_booking || 0);
            qty = unitPrice > 0 && submittedPrice > 0
              ? Math.max(1, Math.round(submittedPrice / unitPrice))
              : 1;
          }

          const maxQty = getMaxQuantity(extra);
          if (qty > maxQty) {
            return res.status(400).json({
              success: false,
              error: `${extra.name} is limited to ${maxQty}.`,
            });
          }

          const chargeType = extra.charge_type === "once" ? "once" : "daily";
          const chargedDays = chargeType === "once" ? 1 : dayCount;

          extrasTotal += unitPrice * qty * chargedDays;
          normalizedExtras.push({
            extra_id: id,
            qty,
            days: chargedDays,
            price_at_booking: unitPrice * qty,
          });
        }

        const carRate = Number(carRows[0].price || 0);
        const carTotal = dayCount * carRate * getTierMultiplier(dayCount);
        const authoritativeTotal = Number((carTotal + extrasTotal).toFixed(2));

        req.body.extras = normalizedExtras;
        req.body.total_price = authoritativeTotal;
        next();
      });
    });
  };
};
