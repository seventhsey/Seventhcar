// pricecalc.js

const carRateCache = new Map();
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
  const priceField = document.getElementById("editTotalPrice");
  const plateNumber = document.getElementById("editPlateNumber").value.trim();
  const startDateStr = document.getElementById("editStartDate").value;
  const startTimeStr = document.getElementById("editStartTime").value;
  const endDateStr = document.getElementById("editEndDate").value;
  const endTimeStr = document.getElementById("editEndTime").value;

  const reservationIdEl = document.getElementById("editReservationId");
  const reservationId = reservationIdEl ? reservationIdEl.value : null;

  if (!plateNumber || !startDateStr || !startTimeStr || !endDateStr || !endTimeStr) return;

  const startDT = parseLocalDateTime(startDateStr, startTimeStr);
  const endDT = parseLocalDateTime(endDateStr, endTimeStr);

  if (endDT <= startDT) return;

  if (await checkIfDatesConflict(plateNumber, startDT, endDT, reservationId)) {
    alert("These dates/times overlap an existing booking for this car.");
    return;
  }

  let dailyRate = carRateCache.get(plateNumber) || 0;

  if (!carRateCache.has(plateNumber)) try {
    const res = await fetch(`/api/cars/${encodeURIComponent(plateNumber)}`);
    if (res.ok) {
      const car = await res.json();
      dailyRate = Number(car.price || 0);
      carRateCache.set(plateNumber, dailyRate);
    }
  } catch (e) {
    console.warn("Failed to fetch car rate:", e);
  }

  const dayCount = calculateBookingDays(startDateStr, startTimeStr, endDateStr, endTimeStr);
  const multiplier = getTierMultiplier(dayCount);

  let extrasTotal = 0;

  document.querySelectorAll

  const carPrice = dayCount * dailyRate * multiplier;
  const finalPrice = carPrice + extrasTotal;

  priceField.value = finalPrice.toFixed(2);
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

  const request = fetch(`/api/reservations?${params.toString()}`)
    .then(async res => {
      if (!res.ok) throw new Error("Conflict check failed.");
      const reservations = await res.json();
      return reservations.some(reservation => {
        if (selfId && String(reservation.id) === String(selfId)) return false;
        const reservationStart = parseLocalDateTime(reservation.start_date, reservation.start_time);
        const reservationEnd = parseLocalDateTime(reservation.end_date, reservation.end_time);
        return startDT < reservationEnd && reservationStart < endDT;
      });
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
