// reservation-modals.js

document.addEventListener("DOMContentLoaded", function () {
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
        const confirmed = await window.uiConfirm({
          title: "Cancel this booking?",
          message: "The reservation will be marked Cancelled. This does not send a confirmation email.",
          confirmText: "Cancel booking",
          tone: "danger",
        });
        if (confirmed) updateReservationStatus(reservationId, "Cancelled");
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

  function openReservationModal(reservationId) {
    fetch(`/api/reservations/${reservationId}`)
      .then(response => {
        if (!response.ok) throw new Error("Could not load reservation details.");
        return response.json();
      })
      .then(reservation => {
        document.getElementById("modalCustomer").innerText = reservation.customer_name;
        document.getElementById("modalEmail").innerText = reservation.customer_email || "-";
        document.getElementById("modalPhone").innerText = reservation.customer_phone || "-";
        document.getElementById("modalFlightNumber").innerText = reservation.flight_number || "-";
        document.getElementById("modalNotes").innerText = reservation.notes || "-";
        document.getElementById("modalPlateNumber").innerText = reservation.plate_number;
        document.getElementById("modalStartDate").innerText = reservation.start_date;
        document.getElementById("modalEndDate").innerText = reservation.end_date;
        document.getElementById("modalPrice").innerText = reservation.total_price;
        document.getElementById("modalStatus").innerText = reservation.status;

        fetch(`/api/reservations/${reservationId}/extras`)
          .then(res => res.json())
          .then(extras => {
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
            }).join('');
          });

        document.getElementById("approveReservation").setAttribute("data-id", reservation.id);
        document.getElementById("rejectReservation").setAttribute("data-id", reservation.id);
        document.getElementById("editReservation").setAttribute("data-id", reservation.id);

        $("#reservationModal").modal("show");
      })
      .catch(error => {
        console.error("Error fetching reservation details:", error);
        window.uiNotify(error.message || "Could not load reservation details.", "error");
      });
  }

  function populatePlateNumberDropdown(selectedPlate = '') {
    fetch('/api/cars')
      .then(res => res.json())
      .then(cars => {
        const dropdown = document.getElementById('editPlateNumber');
        dropdown.innerHTML = '<option value="">Select a plate number...</option>';

        cars.forEach(car => {
          const option = document.createElement('option');
          option.value = car.plate_number;
          option.textContent = car.plate_number;
          if (car.plate_number === selectedPlate) option.selected = true;
          dropdown.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error fetching plate numbers:', err);
        document.getElementById('editPlateNumber').innerHTML = '<option value="">Error loading plate numbers</option>';
        window.uiNotify("Could not load vehicle plate numbers.", "error");
      });
  }

  function openEditReservationModal(reservationId) {
    fetch("/api/extras")
      .then(res => res.json())
      .then(allExtras => {
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
          populatePlateNumberDropdown();
        } else {
          fetch(`/api/reservations/${reservationId}`)
            .then(res => res.json())
            .then(reservation => {
              document.getElementById("editReservationId").value = reservation.id;
              document.getElementById("editCustomerName").value = reservation.customer_name;
              document.getElementById("editCustomerEmail").value = reservation.customer_email;
              document.getElementById("editCustomerPhone").value = reservation.customer_phone;
              document.getElementById("editFlightNumber").value = reservation.flight_number || "";
              document.getElementById("editNotes").value = reservation.notes || "";
              document.getElementById("editStartDate").value = reservation.start_date;
              document.getElementById("editStartTime").value = reservation.start_time;
              document.getElementById("editEndDate").value = reservation.end_date;
              document.getElementById("editEndTime").value = reservation.end_time;
              document.getElementById("editTotalPrice").value = reservation.total_price;
              document.getElementById("editReservationStatus").value = reservation.status;
              populatePlateNumberDropdown(reservation.plate_number);

              fetch(`/api/reservations/${reservationId}/extras`)
                .then(res => res.json())
                .then(selectedExtras => {
                  selectedExtras.forEach(extra => {
                    const chk = document.getElementById(`extra-${extra.extra_id}`);
                    if (chk) chk.checked = true;
                  });
                });
            })
            .catch(err => {
              console.error("Error loading reservation for edit:", err);
              window.uiNotify("Could not load the reservation for editing.", "error");
            });
        }

        setTimeout(() => {
          if (window.registerPriceAutoCalc) window.registerPriceAutoCalc();
        }, 50);

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
      })
      .catch(err => {
        console.error("Error loading extras list:", err);
        window.uiNotify("Could not load extras.", "error");
      });
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

    const updatedReservation = {
      customer_name: document.getElementById("editCustomerName").value,
      customer_email: document.getElementById("editCustomerEmail").value,
      customer_phone: document.getElementById("editCustomerPhone").value,
      flight_number: document.getElementById("editFlightNumber").value,
      notes: document.getElementById("editNotes").value,
      plate_number: plateNumber,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      status: document.getElementById("editReservationStatus").value,
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

  function updateReservationStatus(id, newStatus) {
    fetch(`/api/reservations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Status update failed.");
        return result;
      })
      .then(result => {
        $("#reservationModal").modal("hide");
        window.fetchReservations();

        if (newStatus === "Approved") {
          if (result.emailSent) {
            window.uiNotify(
              "Booking confirmed and confirmation email sent to the customer.",
              "success",
              "Booking confirmed"
            );
          } else if (!result.emailConfigured) {
            window.uiNotify(
              "Booking confirmed, but email is not configured yet.",
              "warning",
              "Booking confirmed"
            );
          } else {
            window.uiNotify(
              result.emailError || "Booking confirmed, but the confirmation email could not be sent.",
              "warning",
              "Email not sent"
            );
          }
        } else {
          window.uiNotify(`Reservation marked ${newStatus}.`, "success");
        }
      })
      .catch(error => {
        console.error("Error updating reservation status:", error);
        window.uiNotify(error.message || "Could not update reservation status.", "error");
      });
  }

  initializeModalEventListeners();
  window.openReservationModal = openReservationModal;
  window.openEditReservationModal = openEditReservationModal;
});
