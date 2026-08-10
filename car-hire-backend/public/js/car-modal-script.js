function initializeModalScript() {
  const modal = document.getElementById('carModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const saveCarBtn = document.getElementById('saveCarBtn');
  const removeCarBtn = document.getElementById('removeCarBtn');
  const addCarBtn = document.getElementById('addCarBtn');

  if (!modal) {
    console.error('Car modal element is missing in the DOM.');
    return;
  }

  if (addCarBtn) {
    addCarBtn.addEventListener('click', () => openCarModal('add'));
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target == modal) modal.style.display = 'none';
  });

  function openCarModal(action, carData = {}) {
    const modalTitle = document.getElementById('modalTitle');
    const carForm = document.getElementById('carForm');
    modal.dataset.action = action;

    if (action === 'edit') {
      modalTitle.textContent = 'Edit Car Details';
      saveCarBtn.textContent = 'Save Changes';
      removeCarBtn.style.display = 'inline-block';
      document.getElementById('carName').value = carData.car_name || '';
      document.getElementById('plateNumber').value = carData.plate_number || '';
      document.getElementById('transmission').value = carData.transmission || '';
      document.getElementById('fuelType').value = carData.fuel_type || '';
      document.getElementById('doorCount').value = carData.door_count || '';
      document.getElementById('storageSpace').value = carData.storage_space || '';
      document.getElementById('price').value = carData.price || '';
      document.getElementById('plateNumber').setAttribute('readonly', true);
    } else {
      modalTitle.textContent = 'Add New Car';
      saveCarBtn.textContent = 'Add Car';
      removeCarBtn.style.display = 'none';
      carForm.reset();
      document.getElementById('plateNumber').removeAttribute('readonly');
    }

    modal.style.display = 'block';
  }

  if (saveCarBtn) {
    saveCarBtn.addEventListener('click', () => {
      const action = modal.dataset.action;
      const formData = new FormData(document.getElementById('carForm'));
      let url;
      let method;

      if (action === 'add') {
        url = '/api/cars';
        method = 'POST';
      } else {
        const plateNumber = document.getElementById('plateNumber').value;
        url = `/api/cars/${plateNumber}`;
        method = 'PUT';
      }

      fetch(url, { method, body: formData })
        .then(async response => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Failed to save car data.');
          return result;
        })
        .then(() => {
          modal.style.display = 'none';
          const carContainer = document.getElementById('carContainer');
          loadCars(carContainer, 'admin');
          window.uiNotify(action === 'add' ? 'Vehicle added.' : 'Vehicle updated.', 'success');
        })
        .catch(error => {
          console.error('Error saving car:', error);
          window.uiNotify(error.message || 'Could not save vehicle.', 'error');
        });
    });
  }

  if (removeCarBtn) {
    removeCarBtn.addEventListener('click', async () => {
      const plateNumber = document.getElementById('plateNumber').value;
      const confirmed = await window.uiConfirm({
        title: 'Remove this vehicle?',
        message: `Vehicle ${plateNumber} will be permanently removed from the fleet.`,
        confirmText: 'Remove vehicle',
        tone: 'danger',
      });
      if (!confirmed) return;

      fetch(`/api/cars/${plateNumber}`, { method: 'DELETE' })
        .then(async response => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Failed to remove car.');
          return result;
        })
        .then(() => {
          modal.style.display = 'none';
          const carContainer = document.getElementById('carContainer');
          loadCars(carContainer, 'admin');
          window.uiNotify('Vehicle removed.', 'success');
        })
        .catch(error => {
          console.error('Error removing car:', error);
          window.uiNotify(error.message || 'Could not remove vehicle.', 'error');
        });
    });
  }

  window.openCarModal = openCarModal;
}
