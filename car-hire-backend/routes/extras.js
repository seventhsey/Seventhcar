// routes/extras.js
const express = require("express");
const router = express.Router();

module.exports = (db) => {
  // GET ALL EXTRAS
  router.get("/", (req, res) => {
    db.query("SELECT * FROM extras", (err, results) => {
      if (err) {
        console.error("Database error (fetching extras):", err);
        return res.status(500).json({ error: "Server error" });
      }
      res.json(results);
    });
  });

  // GET ONE EXTRA
  router.get("/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM extras WHERE id = ?", [id], (err, results) => {
      if (err) {
        console.error("Database error (fetching extra):", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (!results.length) {
        return res.status(404).json({ error: "Extra not found" });
      }
      res.json(results[0]);
    });
  });

  // POST / CREATE
  router.post("/", (req, res) => {
    const { name, price, description, charge_type } = req.body;
    const safeChargeType = charge_type === "once" ? "once" : "daily";
    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }
    db.query(
      "INSERT INTO extras (name, price, description, charge_type) VALUES (?, ?, ?, ?)",
[name, price, description || null, safeChargeType],
      (err, result) => {
        if (err) {
          console.error("DB error (create extra):", err);
          return res.status(500).json({ error: "Server error" });
        }
        res.status(201).json({ id: result.insertId, name, price, description });
      }
    );
  });

  // PUT / UPDATE
  router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { name, price, description, charge_type } = req.body;
    const safeChargeType = charge_type === "once" ? "once" : "daily";
    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }
    db.query(
      "UPDATE extras SET name = ?, price = ?, description = ? WHERE id = ?",
[name, price, description || null, id],
      (err, result) => {
        if (err) {
          console.error("DB error (update extra):", err);
          return res.status(500).json({ error: "Server error" });
        }
        if (!result.affectedRows) {
          return res.status(404).json({ error: "Extra not found" });
        }
        res.json({ id, name, price, description, charge_type: safeChargeType });
      }
    );
  });

  // DELETE
  router.delete("/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM extras WHERE id = ?", [id], (err, result) => {
      if (err) {
        console.error("DB error (delete extra):", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (!result.affectedRows) {
        return res.status(404).json({ error: "Extra not found" });
      }
      res.json({ message: "Extra deleted successfully" });
    });
  });

  return router;
};
