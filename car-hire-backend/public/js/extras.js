// extras.js

document.addEventListener("DOMContentLoaded", function() {
  const extrasContainer = document.getElementById("extrasContainer");
  const addExtraBtn = document.getElementById("addExtraBtn");
  const saveExtraBtn = document.getElementById("saveExtraBtn");

  loadExtras();

  addExtraBtn.addEventListener("click", () => {
    clearModalFields();
    document.getElementById("extrasModalTitle").textContent = "Add New Extra";
    $("#extrasModal").modal("show");
  });

  saveExtraBtn.addEventListener("click", saveExtra);

  function loadExtras() {
    fetch("/api/extras")
      .then(r => {
        if (!r.ok) throw new Error("Could not load extras.");
        return r.json();
      })
      .then(renderExtras)
      .catch(err => {
        console.error("Error loading extras:", err);
        extrasContainer.innerHTML = "<p>Error loading extras.</p>";
        window.uiNotify(err.message || "Could not load extras.", "error");
      });
  }

  function renderExtras(extras) {
    extrasContainer.innerHTML = "";
    if (!extras.length) {
      extrasContainer.innerHTML = "<p>No extras found.</p>";
      return;
    }

    extras.forEach(extra => {
      const col = document.createElement("div");
      col.classList.add("col-md-4");
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

      col.querySelector(".btn-primary").addEventListener("click", () => editExtra(extra));
      col.querySelector(".btn-danger").addEventListener("click", () => deleteExtra(extra.id, extra.name));
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

  async function deleteExtra(extraId, name) {
    const confirmed = await window.uiConfirm({
      title: "Delete this extra?",
      message: `${name || "This extra"} will be permanently removed.`,
      confirmText: "Delete extra",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/extras/${extraId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed.");
      loadExtras();
      window.uiNotify("Extra deleted.", "success");
    } catch (err) {
      console.error("Error deleting extra:", err);
      window.uiNotify(err.message || "Could not delete extra.", "error");
    }
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

    if (!name) {
      window.uiNotify("Please enter an extra name.", "warning");
      return;
    }

    const payload = { name, price, description, charge_type };
    const url = id ? `/api/extras/${id}` : "/api/extras";
    const method = id ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async r => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error || "Save failed.");
        return result;
      })
      .then(() => {
        $("#extrasModal").modal("hide");
        loadExtras();
        window.uiNotify(id ? "Extra updated." : "Extra added.", "success");
      })
      .catch(err => {
        console.error("Error saving extra:", err);
        window.uiNotify(err.message || "Could not save extra.", "error");
      });
  }
});
