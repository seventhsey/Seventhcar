const SEAT_EXTRA_IDS = new Set([4, 5]);
const PROTECTION_EXTRA_IDS = new Set([1, 2, 3]);
const LOCATION_EXTRA_IDS = new Set([9, 10, 11]);

class PricingError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "PricingError";
    this.statusCode = statusCode;
  }
}

function query(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function normalizeTime(value) {
  const clean = String(value || "").trim().slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean)) {
    throw new PricingError("Invalid pickup or return time.");
  }
  return clean;
}

function calculateBookingDays(startDate, startTime, endDate, endTime) {
  const cleanStartTime = normalizeTime(startTime);
  const cleanEndTime = normalizeTime(endTime);
  const startMoment = new Date(`${startDate}T${cleanStartTime}:00`);
  const endMoment = new Date(`${endDate}T${cleanEndTime}:00`);

  if (
    Number.isNaN(startMoment.getTime()) ||
    Number.isNaN(endMoment.getTime()) ||
    endMoment <= startMoment
  ) {
    throw new PricingError("Return date/time must be after pickup date/time.");
  }

  const startDay = new Date(`${startDate}T00:00:00`);
  const endDay = new Date(`${endDate}T00:00:00`);
  let days = Math.floor((endDay - startDay) / 86400000) + 1;

  if (cleanEndTime > cleanStartTime) days += 1;
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

function parseRequestedExtras(items) {
  const requested = Array.isArray(items) ? items : [];
  const byId = new Map();

  for (const item of requested) {
    const id = Number(item?.extra_id ?? item?.id);

    if (!Number.isInteger(id) || id <= 0) {
      throw new PricingError("Invalid extra selection.");
    }

    if (byId.has(id)) {
      throw new PricingError("The same extra cannot be added twice.");
    }

    if (item?.qty !== undefined) {
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new PricingError("Invalid extra quantity.");
      }
    }

    byId.set(id, item || {});
  }

  return byId;
}

function resolveQuantity(requested, extra, maxQuantity) {
  const explicit = Number(requested.qty);
  if (Number.isInteger(explicit) && explicit >= 1) return explicit;

  // Compatibility with older frontend payloads that encoded quantity by
  // multiplying price_at_booking instead of sending qty explicitly.
  const unitPrice = Number(extra.price || 0);
  const submittedPrice = Number(requested.price_at_booking || 0);

  if (unitPrice > 0 && submittedPrice > 0) {
    const ratio = submittedPrice / unitPrice;
    const roundedRatio = Math.max(1, Math.round(ratio));

    if (Math.abs(ratio - roundedRatio) < 0.001) {
      if (roundedRatio <= maxQuantity) return roundedRatio;

      // One intermediate frontend version multiplied an already multiplied
      // price a second time. Recover 2 and 3 seat selections safely.
      const squareRoot = Math.sqrt(roundedRatio);
      if (Number.isInteger(squareRoot) && squareRoot <= maxQuantity) {
        return squareRoot;
      }
    }

    return roundedRatio;
  }

  return 1;
}

function asMoney(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new PricingError(`${label} is invalid.`, 500);
  }
  return amount;
}

async function calculateReservationQuote(db, payload = {}) {
  const {
    plate_number,
    start_date,
    start_time,
    end_date,
    end_time,
  } = payload;

  if (!plate_number || !start_date || !start_time || !end_date || !end_time) {
    throw new PricingError("Vehicle and reservation dates are required.");
  }

  const dayCount = calculateBookingDays(
    start_date,
    start_time,
    end_date,
    end_time
  );

  const requestedById = parseRequestedExtras(payload.extras);
  const ids = [...requestedById.keys()];

  let carRows;
  let extraRows;

  try {
    carRows = await query(
      db,
      "SELECT plate_number, car_name, price FROM cars WHERE plate_number = ?",
      [plate_number]
    );

    if (ids.length > 0) {
      const placeholders = ids.map(() => "?").join(",");
      extraRows = await query(
        db,
        `SELECT id, name, price, charge_type FROM extras WHERE id IN (${placeholders})`,
        ids
      );
    } else {
      extraRows = [];
    }
  } catch (error) {
    console.error("Reservation quote database error:", error);
    throw new PricingError("Could not calculate the reservation price.", 500);
  }

  if (!carRows.length) {
    throw new PricingError("Selected vehicle does not exist.");
  }

  if (extraRows.length !== ids.length) {
    throw new PricingError("One or more selected extras do not exist.");
  }

  const extrasById = new Map(extraRows.map((extra) => [Number(extra.id), extra]));
  const selectedProtectionIds = ids.filter((id) => PROTECTION_EXTRA_IDS.has(id));

  if (selectedProtectionIds.length > 1) {
    throw new PricingError("Only one protection plan may be selected.");
  }

  const selectedLocations = new Set(ids.filter((id) => LOCATION_EXTRA_IDS.has(id)));
  if (selectedLocations.has(11) && (selectedLocations.has(9) || selectedLocations.has(10))) {
    throw new PricingError(
      "Combined pickup/drop-off cannot be selected with individual location extras."
    );
  }

  const quoteExtras = [];
  const normalizedExtras = [];
  let extrasTotal = 0;

  for (const id of ids) {
    const extra = extrasById.get(id);
    const requested = requestedById.get(id) || {};
    const maxQuantity = getMaxQuantity(extra);
    const quantity = resolveQuantity(requested, extra, maxQuantity);

    if (quantity > maxQuantity) {
      throw new PricingError(`${extra.name} is limited to ${maxQuantity}.`);
    }

    const unitPrice = asMoney(extra.price, `${extra.name} price`);
    const chargeType = extra.charge_type === "once" ? "once" : "daily";
    const chargedDays = chargeType === "once" ? 1 : dayCount;
    const lineTotal = Number((unitPrice * quantity * chargedDays).toFixed(2));

    extrasTotal += lineTotal;
    quoteExtras.push({
      extra_id: id,
      name: extra.name,
      quantity,
      max_quantity: maxQuantity,
      unit_price: unitPrice,
      charge_type: chargeType,
      charged_days: chargedDays,
      total: lineTotal,
    });

    normalizedExtras.push({
      extra_id: id,
      qty: quantity,
      days: chargedDays,
      price_at_booking: Number((unitPrice * quantity).toFixed(2)),
    });
  }

  const vehicle = carRows[0];
  const dailyRate = asMoney(vehicle.price, "Vehicle daily rate");
  const multiplier = getTierMultiplier(dayCount);
  const vehicleTotal = Number((dayCount * dailyRate * multiplier).toFixed(2));
  const total = Number((vehicleTotal + extrasTotal).toFixed(2));

  return {
    quote: {
      currency: "EUR",
      day_count: dayCount,
      vehicle: {
        plate_number: vehicle.plate_number,
        name: vehicle.car_name,
        daily_rate: dailyRate,
        multiplier,
        total: vehicleTotal,
      },
      extras: quoteExtras,
      extras_total: Number(extrasTotal.toFixed(2)),
      total,
    },
    normalizedExtras,
  };
}

module.exports = {
  PricingError,
  calculateBookingDays,
  getTierMultiplier,
  getMaxQuantity,
  calculateReservationQuote,
};
