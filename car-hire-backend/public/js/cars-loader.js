/**
 * Load cars from the server and render them inside a given container.
 * @param {HTMLElement} container - The DOM element where car cards should be appended.
 * @param {string} mode - Determines how the cars will be displayed ("admin", "public", etc.).
 */
function loadCars(container, mode) {
  container.replaceChildren();
  const carsRequest = fetch('/api/cars').then(response => {
    if (!response.ok) throw new Error('Could not load vehicles.');
    return response.json();
  });
  const blocksRequest = mode === 'admin'
    ? fetch('/api/car-unavailability').then(response => {
        if (!response.ok) throw new Error('Could not load vehicle unavailability.');
        return response.json();
      })
    : Promise.resolve([]);

  Promise.all([carsRequest, blocksRequest])
    .then(([cars, blocks]) => {
      const blocksByPlate = new Map();
      blocks.forEach(block => {
        const list = blocksByPlate.get(block.plate_number) || [];
        list.push(block);
        blocksByPlate.set(block.plate_number, list);
      });

      cars.forEach(car => {
        if (mode === 'admin') {
          renderCarAdminMode(container, car, blocksByPlate.get(car.plate_number) || []);
        } else if (mode === 'public') {
          renderCarPublicMode(container, car);
        } else {
          // Fallback for other modes
          const defaultDiv = document.createElement('div');
          defaultDiv.textContent = `Car: ${car.car_name} (No specific mode)`;
          container.appendChild(defaultDiv);
        }
      });

      // In admin mode, wire up Edit + Calendar buttons
      if (mode === 'admin') {
        attachEditListeners(container);

        // Attach "View Calendar" button handlers
        container
          .querySelectorAll('.view-calendar-btn')
          .forEach(btn => {
            btn.addEventListener('click', () => {
              const plate = btn.getAttribute('data-plate-number');
              window.open(`partials/calendar.html?plateNumber=${plate}`, '_blank');
            });
          });
      }
    })
    .catch(error => console.error('Error fetching cars:', error));
}

/**
 * Render a single car in "admin" mode.
 * @param {HTMLElement} container - The parent container to append to.
 * @param {Object} car - The car data object.
 */
function renderCarAdminMode(container, car, unavailablePeriods = []) {
  const colDiv = document.createElement('div');
  colDiv.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';

  const carCard = document.createElement('div');
  carCard.className = 'car-card';

  const carImage = car.car_image_url
    ? `/uploads/${car.car_image_url}`
    : '/assets/placeholder.jpg';

  carCard.innerHTML = `
    <div class="car-name">${car.car_name || '—'}</div>
    <img src="${carImage}" alt="Car Image">
    <div class="plate-number">Plate Number: ${car.plate_number}</div>
    <div class="price">Price: €${car.price}</div>
    <button class="btn btn-primary edit-btn" data-plate="${car.plate_number}">
      Edit
    </button>
    <button
      class="btn btn-secondary view-calendar-btn"
      data-plate-number="${car.plate_number}"
    >
      View Calendar
    </button>
  `;

  carCard.appendChild(buildUnavailabilitySection(car, unavailablePeriods, container));

  colDiv.appendChild(carCard);
  container.appendChild(colDiv);
}

function formatDateTime(value) {
  if (!value) return 'Until manually reactivated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildUnavailabilitySection(car, unavailablePeriods, container) {
  const section = document.createElement('div');
  section.className = 'car-unavailability mt-3';

  if (unavailablePeriods.length) {
    const heading = document.createElement('div');
    heading.className = 'unavailable-heading';
    heading.textContent = 'Unavailable';
    section.appendChild(heading);

    unavailablePeriods.forEach(period => {
      const block = document.createElement('div');
      block.className = 'unavailable-period';

      const dates = document.createElement('div');
      dates.textContent = `${formatDateTime(period.start_at)} — ${formatDateTime(period.end_at)}`;
      block.appendChild(dates);

      const reason = document.createElement('div');
      reason.className = 'unavailable-reason';
      reason.textContent = period.reason || 'No reason supplied';
      block.appendChild(reason);

      const affectedIds = Array.isArray(period.affected_reservation_ids)
        ? period.affected_reservation_ids
        : [];
      const affected = document.createElement('div');
      affected.className = affectedIds.length ? 'affected-reservations warning' : 'affected-reservations';
      affected.appendChild(document.createTextNode(
        affectedIds.length ? 'Affected reservations: ' : 'No existing reservations are affected.'
      ));
      affectedIds.forEach((id, index) => {
        if (index) affected.appendChild(document.createTextNode(', '));
        const link = document.createElement('a');
        link.href = `/reservations?open=${encodeURIComponent(id)}`;
        link.textContent = `#${id}`;
        link.title = `Open reservation #${id}`;
        affected.appendChild(link);
      });
      block.appendChild(affected);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn btn-success btn-sm make-available-btn';
      removeButton.textContent = 'Make available';
      removeButton.addEventListener('click', async () => {
        const confirmed = await window.uiConfirm({
          title: 'Make this vehicle available?',
          message: 'This removes the selected unavailable period. Customers may book the vehicle again if no reservation conflicts exist.',
          confirmText: 'Make available',
        });
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/car-unavailability/${period.id}`, { method: 'DELETE' });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Could not remove unavailable period.');
          loadCars(container, 'admin');
          window.uiNotify('Vehicle availability restored.', 'success');
        } catch (error) {
          window.uiNotify(error.message || 'Could not restore vehicle availability.', 'error');
        }
      });
      block.appendChild(removeButton);
      section.appendChild(block);
    });
  }

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'btn btn-warning btn-sm mark-unavailable-btn';
  toggleButton.textContent = 'Mark unavailable';
  section.appendChild(toggleButton);

  const form = document.createElement('div');
  form.className = 'unavailability-form mt-2';
  form.hidden = true;
  const openEndedId = `open-ended-${String(car.plate_number).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  form.innerHTML = `
    <label>Unavailable from</label>
    <input type="datetime-local" class="form-control form-control-sm unavailable-start">
    <label class="mt-2">Unavailable until</label>
    <input type="datetime-local" class="form-control form-control-sm unavailable-end">
    <div class="form-check mt-2 text-left">
      <input class="form-check-input unavailable-open-ended" type="checkbox" id="${openEndedId}">
      <label class="form-check-label" for="${openEndedId}">Until manually reactivated</label>
    </div>
    <label class="mt-2">Reason</label>
    <input type="text" maxlength="255" class="form-control form-control-sm unavailable-reason-input" placeholder="Breakdown, maintenance, inspection…">
  `;

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'btn btn-danger btn-sm save-unavailability-btn';
  saveButton.textContent = 'Block this vehicle';
  form.appendChild(saveButton);

  toggleButton.addEventListener('click', () => {
    form.hidden = !form.hidden;
  });
  const endInput = form.querySelector('.unavailable-end');
  form.querySelector('.unavailable-open-ended').addEventListener('change', event => {
    endInput.disabled = event.target.checked;
    if (event.target.checked) endInput.value = '';
  });
  saveButton.addEventListener('click', async () => {
    const startAt = form.querySelector('.unavailable-start').value;
    const openEnded = form.querySelector('.unavailable-open-ended').checked;
    const endAt = openEnded ? '' : endInput.value;
    const reason = form.querySelector('.unavailable-reason-input').value.trim();
    if (!startAt || (!openEnded && !endAt) || !reason) {
      window.uiNotify('Enter the start, end (or until reactivated), and reason.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/car-unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_number: car.plate_number,
          start_at: startAt,
          end_at: endAt || null,
          reason,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not mark the vehicle unavailable.');
      loadCars(container, 'admin');
      const count = Array.isArray(result.affected_reservation_ids)
        ? result.affected_reservation_ids.length
        : 0;
      window.uiNotify(
        count
          ? `Vehicle blocked. ${count} existing reservation(s) need attention.`
          : 'Vehicle blocked. No existing reservations are affected.',
        count ? 'warning' : 'success'
      );
    } catch (error) {
      window.uiNotify(error.message || 'Could not mark the vehicle unavailable.', 'error');
    }
  });

  section.appendChild(form);
  return section;
}

/**
 * Render a single car in "public" mode.
 * @param {HTMLElement} container - The parent container to append to.
 * @param {Object} car - The car data object.
 */
function renderCarPublicMode(container, car) {
  const colDiv = document.createElement('div');
  colDiv.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';

  const carCard = document.createElement('div');
  carCard.className = 'public-car-card';

  const carImage = car.car_image_url
    ? `/uploads/${car.car_image_url}`
    : '/assets/placeholder.jpg';

  carCard.innerHTML = `
    <img src="${carImage}" alt="Car Image" style="width:100%;">
    <div class="car-name">Car Name: ${car.car_name}</div>
    <div class="fuel-type">Fuel: ${car.fuel_type}</div>
    <div class="price">Price: €${car.price}</div>
    <!-- No edit/calendar buttons in public mode -->
  `;

  colDiv.appendChild(carCard);
  container.appendChild(colDiv);
}

/**
 * Attach event listeners for edit buttons (only in admin mode).
 * @param {HTMLElement} container - The container in which .edit-btn elements were rendered.
 */
function attachEditListeners(container) {
  container.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', function () {
      const plateNumber = this.getAttribute('data-plate');
      // Fetch full car details for the modal
      fetch(`/api/cars/${plateNumber}`)
        .then(response => response.json())
        .then(car => {
          if (car) {
            openCarModal('edit', car);
          } else {
            console.error('Car not found!');
          }
        })
        .catch(error => console.error('Error fetching car details:', error));
    });
  });
}

// Expose the loadCars function globally so you can call it from any script
window.loadCars = loadCars;
