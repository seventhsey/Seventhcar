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
  let renderVersion = 0;
  let statusFilter = "";
  let searchTerm = "";
  let sortKey = "start_date";
  let sortDir = "desc";

  const tableBody = document.getElementById("reservationsTable");
  const searchInput = document.getElementById("searchReservations");
  const statusSelect = document.getElementById("filterStatus");
  const sortableHeaders = Array.from(document.querySelectorAll("th.sortable"));

  function buildExtrasDropdown(extras, diffDays) {
    const options = extras.map(extra => {
      const price = extra.charge_type === "once"
        ? Number(extra.price_at_booking ?? extra.price ?? 0)
        : Number(extra.price_at_booking ?? extra.price ?? 0) * diffDays;
      return `<option>${extra.name} | ${extra.charge_type === "once" ? "one-time" : `${diffDays} day(s)`} | €${price.toFixed(2)}</option>`;
    }).join("");
    return `<select class="form-control form-control-sm">${options || "<option>No extras</option>"}</select>`;
  }

  function renderRow(reservation, extrasDropdown) {
    return `
      <td>${reservation.id}</td>
      <td>${reservation.customer_name}</td>
      <td>${reservation.customer_phone || ""}</td>
      <td>${reservation.plate_number}</td>
      <td>${formatDateLong(reservation.start_date)}</td>
      <td>${String(reservation.start_time || "").slice(0,5)}</td>
      <td>${formatDateLong(reservation.end_date)}</td>
      <td>${String(reservation.end_time || "").slice(0,5)}</td>
      <td>${extrasDropdown}</td>
      <td>€${Number(reservation.total_price || 0).toFixed(2)}</td>
      <td class="status-${String(reservation.status || "").toLowerCase()}">${reservation.status}</td>
      <td>
        <button class="btn btn-primary btn-sm view-btn" data-id="${reservation.id}">View</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${reservation.id}">Delete</button>
      </td>
    `;
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
        const A = new Date(a[sortKey]).getTime();
        const B = new Date(b[sortKey]).getTime();
        return sortDir === "asc" ? (A - B) : (B - A);
      });
    }
    return out;
  }

  async function renderTable() {
    const myRender = ++renderVersion;
    tableBody.innerHTML = "";
    const list = applyFiltersSort(ALL);

    for (const reservation of list) {
      if (myRender !== renderVersion) return;
      try {
        const res = await fetch(`/api/reservations/${reservation.id}/extras`);
        const extras = await res.json();
        const diff = calculateBookingDays(
          reservation.start_date,
          reservation.start_time,
          reservation.end_date,
          reservation.end_time
        );
        const dropdown = buildExtrasDropdown(extras, diff);
        if (myRender !== renderVersion) return;
        const tr = document.createElement("tr");
        tr.innerHTML = renderRow(reservation, dropdown);
        tableBody.appendChild(tr);
      } catch (e) {
        console.error("Error fetching extras:", e);
      }
    }
  }

  window.fetchReservations = async function fetchReservations() {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error("Could not load reservations.");
      ALL = await res.json();
      await renderTable();
    } catch (e) {
      console.error("Error fetching reservations:", e);
      window.uiNotify(e.message || "Could not load reservations.", "error");
    }
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
