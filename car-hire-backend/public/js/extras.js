// extras.js

document.addEventListener("DOMContentLoaded", function() {
    const extrasContainer = document.getElementById("extrasContainer");
    const addExtraBtn = document.getElementById("addExtraBtn");
    const saveExtraBtn = document.getElementById("saveExtraBtn");
  
    // On page load
    loadExtras();
  
    // "Add New Extra" button -> open modal in "Add" mode
    addExtraBtn.addEventListener("click", () => {
      clearModalFields();
      document.getElementById("extrasModalTitle").textContent = "Add New Extra";
      $("#extrasModal").modal("show");
    });
  
    // "Save" button in modal
    saveExtraBtn.addEventListener("click", () => {
      saveExtra();
    });
  
    // --- Functions ---
  
    function loadExtras() {
      fetch("/api/extras")
        .then(r => r.json())
        .then(data => {
          renderExtras(data);
        })
        .catch(err => {
          console.error("Error loading extras:", err);
          extrasContainer.innerHTML = "<p>Error loading extras.</p>";
        });
    }
  
    function renderExtras(extras) {
      extrasContainer.innerHTML = "";
      if (!extras.length) {
        extrasContainer.innerHTML = "<p>No extras found.</p>";
        return;
      }
      extras.forEach(extra => {
        // A column for each extra
        const col = document.createElement("div");
        col.classList.add("col-md-4");
  
        // Build simple "card" style
        col.innerHTML = `
          <div class="extras-card">
            <h5>${extra.name}</h5>
            <p>Price: ${extra.price} EUR ${extra.charge_type === "once" ? "(one-time)" : "per day"}</p>
            <p>${extra.description || ""}</p>
            <p><strong>Charge:</strong> ${extra.charge_type === "once" ? "One-time charge" : "Daily charge"}</p>
            <button class="btn btn-sm btn-primary mr-2" data-id="${extra.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-id="${extra.id}">Delete</button>
          </div>
        `;
        // Edit
        col.querySelector(".btn-primary").addEventListener("click", () => {
          editExtra(extra);
        });
        // Delete
        col.querySelector(".btn-danger").addEventListener("click", () => {
          deleteExtra(extra.id);
        });
        extrasContainer.appendChild(col);
      });
    }
  
    function editExtra(extra) {
      clearModalFields();
      document.getElementById("extrasModalTitle").textContent = "Edit Extra";
      document.getElementById("extraId").value = extra.id;
      document.getElementById("extraName").value = extra.name;
      document.getElementById("extraPrice").value = extra.price;
      document.getElementById("extraDescription").value = extra.description || "";
      document.getElementById("extraChargeType").value = extra.charge_type || "daily";
  
      $("#extrasModal").modal("show");
    }
  
    function deleteExtra(extraId) {
      if (!confirm("Are you sure you want to delete this extra?")) return;
      fetch(`/api/extras/${extraId}`, { method: "DELETE" })
        .then(r => {
          if (!r.ok) throw new Error("Delete failed.");
          loadExtras(); // Refresh
        })
        .catch(err => {
          console.error("Error deleting extra:", err);
          alert("Error deleting extra. Check console for details.");
        });
    }
  
    function clearModalFields() {
      document.getElementById("extraId").value = "";
      document.getElementById("extraName").value = "";
      document.getElementById("extraPrice").value = "";
      document.getElementById("extraDescription").value = "";
      document.getElementById("extraChargeType").value = "daily";
    }
  
    function saveExtra() {
      const id = document.getElementById("extraId").value;
      const name = document.getElementById("extraName").value.trim();
      const price = parseFloat(document.getElementById("extraPrice").value || "0");
      const description = document.getElementById("extraDescription").value.trim();
      const charge_type = document.getElementById("extraChargeType").value;
  
      const payload = { name, price, description, charge_type };
  
      let url = "/api/extras";
      let method = "POST";
  
      if (id) {
        // Edit mode
        url = `/api/extras/${id}`;
        method = "PUT";
      }
  
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(r => {
          if (!r.ok) throw new Error("Save failed.");
          return r.json();
        })
        .then(() => {
          $("#extrasModal").modal("hide");
          loadExtras();
        })
        .catch(err => {
          console.error("Error saving extra:", err);
          alert("Error saving extra. Check console for details.");
        });
    }
  });
  