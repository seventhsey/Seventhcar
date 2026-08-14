// reservation-modals.js

document.addEventListener("DOMContentLoaded", function () {

  // -------------------------------------------------------------------
  // 1) Initialize All Modal-Related Event Listeners
  // -------------------------------------------------------------------
  function initializeModalEventListeners() {
    document.body.addEventListener("click", function (event) {

      // "Add New Reservation" button
      if (event.target.matches("#addReservationBtn")) {
        openEditReservationModal(null); // No ID => new reservation
      }

      // Approve / Reject
      if (event.target.matches("#approveReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        updateReservationStatus(reservationId, "Approved");
      }
      if (event.target.matches("#rejectReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        updateReservationStatus(reservationId, "Cancelled");
      }

      // Edit reservation from details modal
      if (event.target.matches("#editReservation")) {
        const reservationId = event.target.getAttribute("data-id");
        openEditReservationModal(reservationId);
      }

      // Save changes in Edit modal
      if (event.target.matches("#saveReservationChanges")) {
        saveReservationChanges();
      }

    });
  }
  function calculateBookingDays(startDateStr, startTimeStr, endDateStr, endTimeStr) {
    const startDate = new Date(`${startDateStr}T00:00:00`);
    const endDate = new Date(`${endDateStr}T00:00:00`);

    let days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (endTimeStr > startTimeStr) {
      days += 1;
    }

    return Math.max(1, days);
  }
  // -------------------------------------------------------------------
  // 2) View Details Modal
  // -------------------------------------------------------------------
  function openReservationModal(reservationId) {
    fetch(`/api/reservations/${reservationId}`)
      .then(response => response.json())
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

            const start = new Date(`${reservation.start_date}T00:00:00`);
            const end = new Date(`${reservation.end_date}T00:00:00`);
            const diffDays = calculateBookingDays(
              reservation.start_date,
              reservation.start_time,
              reservation.end_date,
              reservation.end_time
            );

            dropdown.innerHTML = extras.map(extra => {
              const name = extra.name || `Extra ${extra.extra_id}`;
              const price =
  extra.charge_type === "once"
    ? Number(extra.price_at_booking || 0)
    : Number(extra.price_at_booking || 0) * diffDays;

              return `
        <option>
          ${name} | ${extra.charge_type === "once" ? "one-time" : `${diffDays} day(s)`} | €${price.toFixed(2)}
        </option>
      `;
            }).join('');
          });

        document.getElementById("approveReservation").setAttribute("data-id", reservation.id);
        document.getElementById("rejectReservation").setAttribute("data-id", reservation.id);
        document.getElementById("editReservation").setAttribute("data-id", reservation.id);

        $("#reservationModal").modal("show");
      })
      .catch(error => console.error("Error fetching reservation details:", error));
  }
  // -------------------------------------------------------------------
  // Plate Number dropdown list
  // -------------------------------------------------------------------

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

          if (car.plate_number === selectedPlate) {
            option.selected = true;
          }

          dropdown.appendChild(option);
        });
      })
      .catch(err => {
        console.error('Error fetching plate numbers:', err);
        document.getElementById('editPlateNumber').innerHTML =
          '<option value="">Error loading plate numbers</option>';
      });
  }

  // -------------------------------------------------------------------
  // 3) Open "Edit Reservation" Modal (reused for NEW and EDIT)
  // -------------------------------------------------------------------
  function openEditReservationModal(reservationId) {
    fetch("/api/extras")
      .then(res => res.json())
      .then(allExtras => {
        const container = document.getElementById('extrasList');
        container.innerHTML = allExtras.map(extra => `
        <div class="form-check mb-2">
          <input type="checkbox"
                 class="form-check-input extra-checkbox"
                 value="${extra.id}"
                 id="extra-${extra.id}">
          <label class="form-check-label" for="extra-${extra.id}">
  ${extra.name} (€${extra.price}${extra.charge_type === "once" ? " once" : "/day"})
</label>
<span data-price="${extra.price}"
      data-charge-type="${extra.charge_type || "daily"}"
      id="extra-price-${extra.id}"
      hidden></span>
        </div>
      `).join('');

        // Populate the plate numbers
        if (!reservationId) {
          // Creating NEW reservation (no selection)
          document.getElementById("editReservationForm").reset();
          populatePlateNumberDropdown();
        } else {
          // EDITING existing reservation
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
            .catch(err => console.error("Error loading reservation for edit:", err));
        }

        setTimeout(() => {
          window.registerPriceAutoCalc();
        }, 50);

        document.querySelectorAll('.extra-checkbox').forEach(chk =>
          chk.addEventListener('change', window.autoCalculatePrice)
        );

        // --- Add real-time conflict checking logic ---
        async function validateDates() {
          const plateNumber = document.getElementById("editPlateNumber").value;
          const startDate = document.getElementById("editStartDate").value;
          const startTime = document.getElementById("editStartTime").value;
          const endDate = document.getElementById("editEndDate").value;
          const endTime = document.getElementById("editEndTime").value;

          if (!plateNumber || !startDate || !startTime || !endDate || !endTime) {
            return;
          }

          const startDT = new Date(`${startDate}T${startTime}`);
          const endDT = new Date(`${endDate}T${endTime}`);

          const conflict = await checkIfDatesConflict(plateNumber, startDT, endDT, reservationId);

          if (conflict) {
            alert("Warning: The selected car is already booked for these dates/times. Please select a different date/time or car.");
            document.getElementById("saveReservationChanges").disabled = true;
          } else {
            document.getElementById("saveReservationChanges").disabled = false;
          }
        }

        ["editPlateNumber", "editStartDate", "editStartTime", "editEndDate", "editEndTime"].forEach(id => {
          document.getElementById(id).addEventListener("change", validateDates);
        });

        // Initial validation on load
        validateDates();

        $("#reservationModal").modal("hide");
        $("#editReservationModal").modal("show");
      })
      .catch(err => console.error("Error loading extras list:", err));
  }




  // -------------------------------------------------------------------
  // 4) Save (Create or Update) Reservation
  // -------------------------------------------------------------------
  function saveReservationChanges() {
    const reservationId = document.getElementById("editReservationId").value.trim();

    // Check if a car is selected
    const plateNumber = document.getElementById("editPlateNumber").value;
    if (!plateNumber) {
      alert("Please select a car plate number before saving the reservation.");
      return;
    }

    // Calculate rental duration
    const start = new Date(document.getElementById("editStartDate").value);
    const end = new Date(document.getElementById("editEndDate").value);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Collect selected extras (default to full duration)
    const extras = Array.from(document.querySelectorAll('.extra-checkbox:checked')).map(chk => {
  const priceEl = document.getElementById(`extra-price-${chk.value}`);
  const chargeType = priceEl?.dataset?.chargeType || "daily";

  return {
    extra_id: parseInt(chk.value, 10),
    days: chargeType === "once" ? 1 : diffDays,
    price_at_booking: parseFloat(priceEl.dataset.price)
  };
});

    const updatedReservation = {
      customer_name: document.getElementById("editCustomerName").value,
      customer_email: document.getElementById("editCustomerEmail").value,
      customer_phone: document.getElementById("editCustomerPhone").value,
      flight_number: document.getElementById("editFlightNumber").value,
      notes: document.getElementById("editNotes").value,
      plate_number: plateNumber, // Already retrieved earlier
      start_date: document.getElementById("editStartDate").value,
      start_time: document.getElementById("editStartTime").value,
      end_date: document.getElementById("editEndDate").value,
      end_time: document.getElementById("editEndTime").value,
      total_price: document.getElementById("editTotalPrice").value,
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
      .then(response => response.json())
      .then(() => {
        $("#editReservationModal").modal("hide");
        window.fetchReservations();
      })
      .catch(error => console.error("Error saving reservation:", error));
  }




  // -------------------------------------------------------------------
  // 5) Approve/Reject Reservation (Update Status)
  // -------------------------------------------------------------------
  function updateReservationStatus(id, newStatus) {
    fetch(`/api/reservations/${id}`)
      .then(response => response.json())
      .then(reservation => {
        const updatedReservation = {
          customer_name: reservation.customer_name,
          customer_email: reservation.customer_email,
          customer_phone: reservation.customer_phone,
          flight_number: reservation.flight_number,
          notes: reservation.notes || "",
          plate_number: reservation.plate_number,
          start_date: reservation.start_date,
          start_time: reservation.start_time,
          end_date: reservation.end_date,
          end_time: reservation.end_time,
          total_price: reservation.total_price,
          status: newStatus
        };

        fetch(`/api/reservations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedReservation)
        })
          .then(response => response.json())
          .then(() => {
            $("#reservationModal").modal("hide");
            window.fetchReservations();
          })
          .catch(error => console.error("Error updating reservation:", error));
      })
      .catch(error => console.error("Error fetching reservation data:", error));
  }

  // -------------------------------------------------------------------
  // 6) Init
  // -------------------------------------------------------------------

  initializeModalEventListeners();

  // Expose globally
  window.openReservationModal = openReservationModal;
  window.openEditReservationModal = openEditReservationModal;
});
