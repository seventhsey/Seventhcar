// public/js/reservations.js

document.addEventListener("DOMContentLoaded", function () {
  function ordinal(n){const s=["th","st","nd","rd"],v=n%100;return s[(v-20)%10]||s[v]||s[0];}

  function parseDateOnly(dateLike) {
    if (!dateLike) return null;
    const dateStr = String(dateLike).split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function formatDateLong(dateLike) {
    const d = parseDateOnly(dateLike);
    if (!d || Number.isNaN(d.getTime())) return dateLike || "";
    const day = d.getDate();
    const month = d.toLocaleString("en-GB", { month: "long" });
    const year = d.getFullYear();
    return `${day}${ordinal(day)} ${month} ${year}`;
  }

  function normalize(str){ return (str||"").toString().toLowerCase().trim(); }

  let ALL = [];
  let statusFilter = "";
  let searchTerm = "";
  let sortKey = "start_date";
  let sortDir = "desc";
  let linkedReservationId = new URLSearchParams(window.location.search).get("open");

  const tableBody = document.getElementById("reservationsTable");
  const searchInput = document.getElementById("searchReservations");
  const statusSelect = document.getElementById("filterStatus");
  const sortableHeaders = Array.from(document.querySelectorAll("th.sortable"));

  function appendTextCell(row, value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "");
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
  }

  function buildExtrasDropdown(extras, diffDays) {
    const dropdown = document.createElement("select");
    dropdown.className = "form-control form-control-sm";

    if (!extras.length) {
      const option = document.createElement("option");
      option.textContent = "No extras";
      dropdown.appendChild(option);
      return dropdown;
    }

    extras.forEach(extra => {
      const price = extra.charge_type === "once"
        ? Number(extra.price_at_booking ?? extra.price ?? 0)
        : Number(extra.price_at_booking ?? extra.price ?? 0) * diffDays;
      const option = document.createElement("option");
      option.textContent = `${extra.name || `Extra ${extra.extra_id}`} | ${extra.charge_type === "once" ? "one-time" : `${diffDays} day(s)`} | €${price.toFixed(2)}`;
      dropdown.appendChild(option);
    });

    return dropdown;
  }

  function buildReservationRow(reservation, diffDays) {
    const row = document.createElement("tr");
    appendTextCell(row, reservation.id);
    appendTextCell(row, reservation.customer_name);
    appendTextCell(row, reservation.customer_phone || "");
    appendTextCell(row, reservation.plate_number);
    appendTextCell(row, formatDateLong(reservation.start_date));
    appendTextCell(row, String(reservation.start_time || "").slice(0, 5));
    appendTextCell(row, formatDateLong(reservation.end_date));
    appendTextCell(row, String(reservation.end_time || "").slice(0, 5));

    const extrasCell = document.createElement("td");
    extrasCell.appendChild(buildExtrasDropdown(reservation.extras || [], diffDays));
    row.appendChild(extrasCell);

    appendTextCell(row, `€${Number(reservation.total_price || 0).toFixed(2)}`);
    const safeStatus = ["Pending", "Approved", "Completed", "Cancelled"].includes(reservation.status)
      ? reservation.status
      : "Pending";
    appendTextCell(row, safeStatus, `status-${safeStatus.toLowerCase()}`);

    const actionsCell = document.createElement("td");
    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "btn btn-primary btn-sm view-btn";
    viewButton.dataset.id = String(reservation.id);
    viewButton.textContent = "View";
    actionsCell.appendChild(viewButton);
    actionsCell.appendChild(document.createTextNode(" "));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-danger btn-sm delete-btn";
    deleteButton.dataset.id = String(reservation.id);
    deleteButton.textContent = "Delete";
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

    return row;
  }

  function applyFiltersSort(list) {
    let out = statusFilter ? list.filter(r => r.status === statusFilter) : list.slice();

    if (searchTerm) {
      const q = normalize(searchTerm);
      out = out.filter(r => {
        const prettyStart = normalize(formatDateLong(r.start_date));
        const prettyEnd = normalize(formatDateLong(r.end_date));
        return (
          normalize(r.customer_name).includes(q) ||
          normalize(r.customer_phone).includes(q) ||
          normalize(r.plate_number).includes(q) ||
          normalize(r.start_date).includes(q) ||
          normalize(r.end_date).includes(q) ||
          prettyStart.includes(q) ||
          prettyEnd.includes(q)
        );
      });
    }

    if (sortKey) {
      out.sort((a,b) => {
        const aTime = sortKey === "start_date"
          ? new Date(`${a.start_date}T${String(a.start_time || "00:00").slice(0, 5)}`).getTime()
          : new Date(`${a.end_date}T${String(a.end_time || "00:00").slice(0, 5)}`).getTime();
        const bTime = sortKey === "start_date"
          ? new Date(`${b.start_date}T${String(b.start_time || "00:00").slice(0, 5)}`).getTime()
          : new Date(`${b.end_date}T${String(b.end_time || "00:00").slice(0, 5)}`).getTime();
        const comparison = (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);

        if (comparison !== 0) {
          return sortDir === "asc" ? comparison : -comparison;
        }

        return sortDir === "asc"
          ? Number(a.id) - Number(b.id)
          : Number(b.id) - Number(a.id);
      });
    }
    return out;
  }

  function renderTable() {
    tableBody.replaceChildren();
    const list = applyFiltersSort(ALL);

    for (const reservation of list) {
      const diff = calculateBookingDays(
        reservation.start_date,
        reservation.start_time,
        reservation.end_date,
        reservation.end_time
      );
      tableBody.appendChild(buildReservationRow(reservation, diff));
    }
  }

  window.fetchReservations = async function fetchReservations() {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error("Could not load reservations.");
      ALL = await res.json();
      await renderTable();
      if (linkedReservationId) {
        const idToOpen = linkedReservationId;
        linkedReservationId = null;
        window.history.replaceState({}, "", window.location.pathname);

        let attempts = 0;
        const openWhenReady = () => {
          attempts += 1;
          if (window.openReservationModal && document.getElementById("reservationModal")) {
            window.openReservationModal(idToOpen);
          } else if (attempts < 20) {
            window.setTimeout(openWhenReady, 100);
          }
        };
        openWhenReady();
      }
    } catch (e) {
      console.error("Error fetching reservations:", e);
      window.uiNotify(e.message || "Could not load reservations.", "error");
    }
  };

  window.getCachedReservation = function getCachedReservation(id) {
    return ALL.find(reservation => String(reservation.id) === String(id)) || null;
  };

  document.body.addEventListener("click", async function (event) {
    if (event.target.matches(".view-btn")) {
      const id = event.target.getAttribute("data-id");
      openReservationModal(id);
    }

    if (event.target.matches(".delete-btn")) {
      const id = event.target.getAttribute("data-id");
      const confirmed = await window.uiConfirm({
        title: "Delete this reservation?",
        message: "This permanently removes the reservation and its extras. This action cannot be undone.",
        confirmText: "Delete reservation",
        tone: "danger",
      });
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/reservations/${id}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not delete reservation.");
        ALL = ALL.filter(r => String(r.id) !== String(id));
        await renderTable();
        window.uiNotify("Reservation deleted.", "success");
      } catch (e) {
        console.error("Error deleting reservation:", e);
        window.uiNotify(e.message || "Could not delete reservation.", "error");
      }
    }
  });

  statusSelect.addEventListener("change", async function(){
    statusFilter = this.value || "";
    await renderTable();
  });

  let t = null;
  searchInput.addEventListener("input", function(){
    clearTimeout(t);
    t = setTimeout(() => {
      searchTerm = this.value;
      renderTable();
    }, 200);
  });

  function calculateBookingDays(startDateStr, startTimeStr, endDateStr, endTimeStr) {
    const startDate = new Date(`${startDateStr}T00:00:00`);
    const endDate = new Date(`${endDateStr}T00:00:00`);
    let days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (endTimeStr > startTimeStr) days += 1;
    return Math.max(1, days);
  }

  function clearSortHeaderStyles() {
    sortableHeaders.forEach(h => h.classList.remove("sort-asc","sort-desc"));
  }

  const defaultSortHeader = sortableHeaders.find(
    h => h.getAttribute("data-sort-key") === sortKey
  );
  if (defaultSortHeader) defaultSortHeader.classList.add("sort-desc");

  sortableHeaders.forEach(h => {
    h.addEventListener("click", async () => {
      const key = h.getAttribute("data-sort-key");
      if (sortKey === key) {
        sortDir = (sortDir === "asc") ? "desc" : "asc";
      } else {
        sortKey = key;
        sortDir = "asc";
      }
      clearSortHeaderStyles();
      h.classList.add(sortDir === "asc" ? "sort-asc" : "sort-desc");
      await renderTable();
    });
  });

  window.fetchReservations();
});
