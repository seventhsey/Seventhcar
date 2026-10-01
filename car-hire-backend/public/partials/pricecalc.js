// pricecalc.js

let quoteRequestController = null;
const conflictRequestCache = new Map();

function calculateBookingDays(startDateStr, startTimeStr, endDateStr, endTimeStr) {
  const startDate = new Date(`${startDateStr}T00:00:00`);
  const endDate = new Date(`${endDateStr}T00:00:00`);

  let days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  if (endTimeStr > startTimeStr) {
    days += 1;
  }

  return Math.max(1, days);
}

function getTierMultiplier(dayCount) {
  if (dayCount === 1) return 1.5;
  if (dayCount >= 2 && dayCount <= 3) return 1.25;
  if (dayCount >= 4 && dayCount <= 6) return 1.11;
  if (dayCount >= 7 && dayCount <= 10) return 1.0;
  if (dayCount >= 11 && dayCount <= 14) return 0.9;
  if (dayCount >= 15 && dayCount <= 21) return 0.8;
  return 0.7;
}

function registerPriceAutoCalc() {
  ["editPlateNumber", "editStartDate", "editStartTime", "editEndDate", "editEndTime"]
    .map(id => document.getElementById(id))
    .filter(Boolean)
    .forEach(el => el.addEventListener("change", autoCalculatePrice));

  document.querySelectorAll(".extra-checkbox")
    .forEach(chk => chk.addEventListener("change", autoCalculatePrice));

  autoCalculatePrice();
}

async function autoCalculatePrice() {
  if (quoteRequestController) quoteRequestController.abort();
  const controller = new AbortController();
  quoteRequestController = controller;
  const priceField = document.getElementById("editTotalPrice");
  priceField.value = "";
  const plateNumber = document.getElementById("editPlateNumber").value.trim();
  const startDateStr = document.getElementById("editStartDate").value;
  const startTimeStr = document.getElementById("editStartTime").value;
  const endDateStr = document.getElementById("editEndDate").value;
  const endTimeStr = document.getElementById("editEndTime").value;

  if (!plateNumber || !startDateStr || !startTimeStr || !endDateStr || !endTimeStr) return;

  const startDT = parseLocalDateTime(startDateStr, startTimeStr);
  const endDT = parseLocalDateTime(endDateStr, endTimeStr);

  if (endDT <= startDT) return;

  const extras = Array.from(document.querySelectorAll('.extra-checkbox:checked')).map(input => ({
    extra_id: Number(input.value),
    qty: 1,
  }));

  try {
    const response = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        plate_number: plateNumber,
        start_date: startDateStr,
        start_time: startTimeStr,
        end_date: endDateStr,
        end_time: endTimeStr,
        extras,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success || !Number.isFinite(Number(result.quote?.total))) {
      throw new Error(result.error || 'Could not calculate the reservation price.');
    }
    if (!controller.signal.aborted) {
      priceField.value = Number(result.quote.total).toFixed(2);
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error('Admin price quote failed:', error);
    window.uiNotify(error.message || 'Could not calculate the reservation price.', 'error');
  }
}

function parseLocalDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

async function checkIfDatesConflict(plateNumber, startDT, endDT, selfId = null) {
  const params = new URLSearchParams({ plate_number: plateNumber });
  const cacheKey = [
    params.toString(),
    startDT.getTime(),
    endDT.getTime(),
    selfId || "0",
  ].join("|");

  if (conflictRequestCache.has(cacheKey)) {
    return conflictRequestCache.get(cacheKey);
  }

  const request = Promise.all([
    fetch(`/api/reservations?${params.toString()}`),
    fetch(`/api/car-unavailability?${params.toString()}`),
  ])
    .then(async ([reservationResponse, unavailableResponse]) => {
      if (!reservationResponse.ok || !unavailableResponse.ok) {
        throw new Error("Conflict check failed.");
      }
      const [reservations, unavailablePeriods] = await Promise.all([
        reservationResponse.json(),
        unavailableResponse.json(),
      ]);
      const reservationConflict = reservations.some(reservation => {
        if (selfId && String(reservation.id) === String(selfId)) return false;
        if (!["Pending", "Approved"].includes(reservation.status)) return false;
        const reservationStart = parseLocalDateTime(reservation.start_date, reservation.start_time);
        const reservationEnd = parseLocalDateTime(reservation.end_date, reservation.end_time);
        return startDT < reservationEnd && reservationStart < endDT;
      });
      const unavailableConflict = unavailablePeriods.some(period => {
        const unavailableStart = new Date(period.start_at);
        const unavailableEnd = period.end_at ? new Date(period.end_at) : null;
        return startDT < (unavailableEnd || new Date(8640000000000000)) && unavailableStart < endDT;
      });
      return reservationConflict || unavailableConflict;
    })
    .catch(e => {
      console.warn("Conflict check failed:", e);
      return false;
    });

  conflictRequestCache.set(cacheKey, request);
  window.setTimeout(() => conflictRequestCache.delete(cacheKey), 2000);

  try {
    return await request;
  } finally {
    // The short cache intentionally remains so duplicate change handlers reuse it.
  }
}

window.registerPriceAutoCalc = registerPriceAutoCalc;
window.autoCalculatePrice = autoCalculatePrice;
window.calculateBookingDays = calculateBookingDays;
window.getTierMultiplier = getTierMultiplier;
