// reservation-modals.js

document.addEventListener("DOMContentLoaded", function () {
  let statusChangePending = false;
  let carsPromise = null;
  let extrasPromise = null;

  async function fetchJson(url) {
    const response = await fetch(url);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Could not load ${url}.`);
    return result;
  }

  function loadCars() {
    if (!carsPromise) {
      carsPromise = fetchJson("/api/cars").catch(error => {
        carsPromise = null;
        throw error;
      });
    }
    return carsPromise;
  }

  function loadExtras() {
    if (!extrasPromise) {
      extrasPromise = fetchJson("/api/extras").catch(error => {
        extrasPromise = null;
        throw error;
      });
    }
    return extrasPromise;
  }

  async function loadReservationDetails(reservationId) {
    const cachedReservation = window.getCachedReservation
      ? window.getCachedReservation(reservationId)
      : null;

    if (cachedReservation) {
      return {
        reservation: cachedReservation,
        extras: cachedReservation.extras || [],
      };
    }

    const [reservation, extras] = await Promise.all([
      fetchJson(`/api/reservations/${reservationId}`),
      fetchJson(`/api/reservations/${reservationId}/extras`),
    ]);
    return { reservation, extras };
  }

  function initializeModalEventListeners() {
    document.body.addEventListener("click", async function (event) {
      if (event.target.matches("#addReservationBtn")) {
        openEditReservationModal(null);
      }

      if (event.target.matches("#approveReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        const confirmed = await window.uiConfirm({
          title: "Confirm this booking?",
          message: "The reservation will be marked Approved and the customer will receive a confirmation email.",
          confirmText: "Confirm booking",
        });
        if (confirmed) updateReservationStatus(reservationId, "Approved");
      }

      if (event.target.matches("#rejectReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        if (statusChangePending) return;
        const isCancelled = document.getElementById("modalStatus").innerText === "Cancelled";
        const savedReason = document.getElementById("modalCancellationReason").innerText;
        const reason = await window.uiConfirm({
          title: isCancelled ? "Resend cancellation email?" : "Cancel this booking?",
          message: "This reason will be emailed to the customer. Keep internal notes out of this message.",
          reasonLabel: "Reason for cancellation (customer will see this)",
          initialReason: savedReason === "-" ? "" : savedReason,
          confirmText: isCancelled ? "Resend email" : "Cancel and email customer",
          tone: "danger",
        });
        if (reason) updateReservationStatus(reservationId, "Cancelled", reason, isCancelled);
      }

      if (event.target.matches("#editReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        openEditReservationModal(reservationId);
      }

      if (event.target.matches("#saveReservationChanges")) {
        saveReservationChanges();
      }
    });
  }

  function calculateBookingDays(startDateStr, startTimeStr, endDateStr, endTimeStr) {
    const startDate = new Date(`${startDateStr}T00:00:00`);
    const endDate = new Date(`${endDateStr}T00:00:00`);
    let days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (endTimeStr > startTimeStr) days += 1;
    return Math.max(1, days);
  }

  async function openReservationModal(reservationId) {
    try {
        const { reservation, extras } = await loadReservationDetails(reservationId);
        document.getElementById("modalCustomer").innerText = reservation.customer_name;
        document.getElementById("modalEmail").innerText = reservation.customer_email || "-";
        document.getElementById("modalPhone").innerText = reservation.customer_phone || "-";
        document.getElementById("modalFlightNumber").innerText = reservation.flight_number || "-";
        document.getElementById("modalPickupLocation").innerText = reservation.pickup_location || "-";
        document.getElementById("modalDropoffLocation").innerText = reservation.dropoff_location || "-";
        document.getElementById("modalNotes").innerText = reservation.notes || "-";
        document.getElementById("modalCancellationReason").innerText = reservation.cancellation_reason || "-";
        document.getElementById("modalCancellationReasonRow").style.display = reservation.cancellation_reason ? "block" : "none";
        document.getElementById("rejectReservation").textContent = reservation.status === "Cancelled" ? "Resend cancellation email" : "Reject/Cancel";
        document.getElementById("modalPlateNumber").innerText = reservation.plate_number;
        document.getElementById("modalStartDate").innerText = reservation.start_date;
        document.getElementById("modalEndDate").innerText = reservation.end_date;
        document.getElementById("modalPrice").innerText = reservation.total_price;
        const hasPriceOverride = reservation.price_override !== null && reservation.price_override !== undefined;
        document.getElementById("modalCalculatedPrice").innerText = reservation.calculated_price || reservation.total_price;
        document.getElementById("modalPriceOverrideReason").innerText = reservation.price_override_reason || "-";
        document.getElementById("modalCalculatedPriceRow").style.display = hasPriceOverride ? "block" : "none";
        document.getElementById("modalPriceOverrideReasonRow").style.display = hasPriceOverride ? "block" : "none";
        document.getElementById("modalStatus").innerText = reservation.status;

        const dropdown = document.getElementById("extrasDropdown");
        const diffDays = calculateBookingDays(
          reservation.start_date,
          reservation.start_time,
          reservation.end_date,
          reservation.end_time
        );

        dropdown.innerHTML = extras.map(extra => {
          const name = extra.name || `Extra ${extra.extra_id}`;
          const price = extra.charge_type === "once"
            ? Number(extra.price_at_booking || 0)
            : Number(extra.price_at_booking || 0) * diffDays;

          return `<option>${name} | ${extra.charge_type === "once" ? "one-time" : `${diffDays} day(s)`} | €${price.toFixed(2)}</option>`;
        }).join('') || "<option>No extras</option>";

        document.getElementById("approveReservation").setAttribute("data-id", reservation.id);
        document.getElementById("rejectReservation").setAttribute("data-id", reservation.id);
        document.getElementById("editReservation").setAttribute("data-id", reservation.id);

        $("#reservationModal").modal("show");
    } catch (error) {
      console.error("Error fetching reservation details:", error);
      window.uiNotify(error.message || "Could not load reservation details.", "error");
    }
  }

  function populatePlateNumberDropdown(cars, selectedPlate = '') {
    const dropdown = document.getElementById('editPlateNumber');
    dropdown.innerHTML = '<option value="">Select a plate number...</option>';

    cars.forEach(car => {
      const option = document.createElement('option');
      option.value = car.plate_number;
      option.textContent = car.plate_number;
      if (car.plate_number === selectedPlate) option.selected = true;
      dropdown.appendChild(option);
    });
  }

  async function openEditReservationModal(reservationId) {
    try {
        const [allExtras, cars, details] = await Promise.all([
          loadExtras(),
          loadCars(),
          reservationId ? loadReservationDetails(reservationId) : Promise.resolve(null),
        ]);
        const container = document.getElementById('extrasList');
        container.innerHTML = allExtras.map(extra => `
          <div class="form-check mb-2">
            <input type="checkbox" class="form-check-input extra-checkbox" value="${extra.id}" id="extra-${extra.id}">
            <label class="form-check-label" for="extra-${extra.id}">${extra.name} (€${extra.price}${extra.charge_type === "once" ? " once" : "/day"})</label>
            <span data-price="${extra.price}" data-charge-type="${extra.charge_type || "daily"}" id="extra-price-${extra.id}" hidden></span>
          </div>
        `).join('');

        if (!reservationId) {
          document.getElementById("editReservationForm").reset();
          document.getElementById("editReservationId").value = "";
          document.querySelector('#editReservationStatus option[value="Cancelled"]').disabled = true;
          populatePlateNumberDropdown(cars);
        } else {
              const { reservation, extras: selectedExtras } = details;
              document.getElementById("editReservationId").value = reservation.id;
              document.getElementById("editCustomerName").value = reservation.customer_name;
              document.getElementById("editCustomerEmail").value = reservation.customer_email;
              document.getElementById("editCustomerPhone").value = reservation.customer_phone;
              document.getElementById("editFlightNumber").value = reservation.flight_number || "";
              document.getElementById("editPickupLocation").value = reservation.pickup_location || "";
              document.getElementById("editDropoffLocation").value = reservation.dropoff_location || "";
              document.getElementById("editNotes").value = reservation.notes || "";
              document.getElementById("editStartDate").value = reservation.start_date;
              document.getElementById("editStartTime").value = reservation.start_time;
              document.getElementById("editEndDate").value = reservation.end_date;
              document.getElementById("editEndTime").value = reservation.end_time;
              document.getElementById("editTotalPrice").value = reservation.calculated_price || reservation.total_price;
              const hasOverride = reservation.price_override !== null && reservation.price_override !== undefined;
              document.getElementById("enablePriceOverride").checked = hasOverride;
              document.getElementById("editPriceOverride").value = hasOverride ? reservation.price_override : "";
              document.getElementById("editPriceOverrideReason").value = reservation.price_override_reason || "";
              document.getElementById("editReservationStatus").value = reservation.status;
              document.querySelector('#editReservationStatus option[value="Cancelled"]').disabled = reservation.status !== "Cancelled";
              populatePlateNumberDropdown(cars, reservation.plate_number);

              selectedExtras.forEach(extra => {
                const chk = document.getElementById(`extra-${extra.extra_id}`);
                if (chk) chk.checked = true;
              });
        }

        setTimeout(() => {
          if (window.registerPriceAutoCalc) window.registerPriceAutoCalc();
        }, 50);

        const overrideCheckbox = document.getElementById("enablePriceOverride");
        const overridePrice = document.getElementById("editPriceOverride");
        const overrideReason = document.getElementById("editPriceOverrideReason");
        const syncOverrideFields = () => {
          overridePrice.disabled = !overrideCheckbox.checked;
          overrideReason.disabled = !overrideCheckbox.checked;
          if (!overrideCheckbox.checked) {
            overridePrice.value = "";
            overrideReason.value = "";
          }
        };
        overrideCheckbox.onchange = syncOverrideFields;
        syncOverrideFields();

        document.querySelectorAll('.extra-checkbox').forEach(chk =>
          chk.addEventListener('change', () => window.autoCalculatePrice && window.autoCalculatePrice())
        );

        async function validateDates() {
          const plateNumber = document.getElementById("editPlateNumber").value;
          const startDate = document.getElementById("editStartDate").value;
          const startTime = document.getElementById("editStartTime").value;
          const endDate = document.getElementById("editEndDate").value;
          const endTime = document.getElementById("editEndTime").value;

          if (!plateNumber || !startDate || !startTime || !endDate || !endTime) return;

          const startDT = new Date(`${startDate}T${startTime}`);
          const endDT = new Date(`${endDate}T${endTime}`);
          const conflict = await checkIfDatesConflict(plateNumber, startDT, endDT, reservationId);

          if (conflict) {
            window.uiNotify(
              "The selected car is already booked for these dates/times. Choose another car or date range.",
              "warning",
              "Vehicle unavailable"
            );
            document.getElementById("saveReservationChanges").disabled = true;
          } else {
            document.getElementById("saveReservationChanges").disabled = false;
          }
        }

        ["editPlateNumber", "editStartDate", "editStartTime", "editEndDate", "editEndTime"].forEach(id => {
          document.getElementById(id).addEventListener("change", validateDates);
        });

        validateDates();
        $("#reservationModal").modal("hide");
        $("#editReservationModal").modal("show");
    } catch (error) {
      console.error("Error loading reservation editor:", error);
      window.uiNotify(error.message || "Could not load the reservation editor.", "error");
    }
  }

  function saveReservationChanges() {
    const reservationId = document.getElementById("editReservationId").value.trim();
    const plateNumber = document.getElementById("editPlateNumber").value;

    if (!plateNumber) {
      window.uiNotify("Please select a vehicle before saving.", "warning");
      return;
    }

    const startDate = document.getElementById("editStartDate").value;
    const startTime = document.getElementById("editStartTime").value;
    const endDate = document.getElementById("editEndDate").value;
    const endTime = document.getElementById("editEndTime").value;

    const extras = Array.from(document.querySelectorAll('.extra-checkbox:checked')).map(chk => ({
      extra_id: parseInt(chk.value, 10),
      qty: 1,
    }));
    const usePriceOverride = document.getElementById("enablePriceOverride").checked;
    const priceOverride = document.getElementById("editPriceOverride").value;
    const priceOverrideReason = document.getElementById("editPriceOverrideReason").value.trim();

    if (usePriceOverride && (!priceOverride || !priceOverrideReason)) {
      window.uiNotify("Enter a manual final price and the reason for overriding it.", "warning");
      return;
    }

    const updatedReservation = {
      customer_name: document.getElementById("editCustomerName").value,
      customer_email: document.getElementById("editCustomerEmail").value,
      customer_phone: document.getElementById("editCustomerPhone").value,
      flight_number: document.getElementById("editFlightNumber").value,
      pickup_location: document.getElementById("editPickupLocation").value,
      dropoff_location: document.getElementById("editDropoffLocation").value,
      notes: document.getElementById("editNotes").value,
      plate_number: plateNumber,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      status: document.getElementById("editReservationStatus").value,
      price_override: usePriceOverride ? Number(priceOverride) : null,
      price_override_reason: usePriceOverride ? priceOverrideReason : "",
      extras
    };

    const method = reservationId ? "PUT" : "POST";
    const url = reservationId ? `/api/reservations/${reservationId}` : "/api/reservations";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedReservation)
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Reservation could not be saved.");
        return result;
      })
      .then(() => {
        $("#editReservationModal").modal("hide");
        window.uiNotify("Reservation saved successfully.", "success");
        window.fetchReservations();
      })
      .catch(error => {
        console.error("Error saving reservation:", error);
        window.uiNotify(error.message || "Could not save reservation.", "error");
      });
  }

  function updateReservationStatus(id, newStatus, cancellationReason = "", resendEmail = false) {
    if (statusChangePending) return;
    statusChangePending = true;
    document.getElementById("rejectReservation").disabled = true;
    document.getElementById("approveReservation").disabled = true;
    fetch(`/api/reservations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, cancellation_reason: cancellationReason, resendEmail })
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Status update failed.");
        return result;
      })
      .then(result => {
        $("#reservationModal").modal("hide");
        window.fetchReservations();

        if (result.unchanged) {
          window.uiNotify(`Reservation is already ${newStatus}. No new email was sent.`, "info");
        } else if (newStatus === "Approved" || newStatus === "Cancelled") {
          const label = newStatus === "Cancelled" ? "cancelled" : "confirmed";
          if (result.emailSent) {
            window.uiNotify(`Booking ${label} and email sent to the customer.`, "success");
          } else if (result.emailConfigured === false) {
            window.uiNotify(`Booking ${label}, but email is not configured. Check backend email settings before retrying.`, "warning", "Customer not notified");
          } else {
            window.uiNotify(result.emailError || `Booking ${label}, but the email could not be sent.`, "warning", "Customer not notified");
          }
        } else {
          window.uiNotify(`Reservation marked ${newStatus}.`, "success");
        }
      })
      .catch(error => {
        console.error("Error updating reservation status:", error);
        window.uiNotify(error.message || "Could not update reservation status.", "error");
      })
      .finally(() => {
        statusChangePending = false;
        document.getElementById("rejectReservation").disabled = false;
        document.getElementById("approveReservation").disabled = false;
      });
  }

  initializeModalEventListeners();
  window.openReservationModal = openReservationModal;
  window.openEditReservationModal = openEditReservationModal;
});
