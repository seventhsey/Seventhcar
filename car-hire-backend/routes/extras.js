const express = require("express");

module.exports = (db) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    db.query("SELECT * FROM extras", (error, results) => {
      if (error) {
        console.error("Database error fetching extras:", error);
        return res.status(500).json({ error: "Server error" });
      }
      res.json(results);
    });
  });

  router.get("/:id", (req, res) => {
    db.query(
      "SELECT * FROM extras WHERE id = ?",
      [req.params.id],
      (error, results) => {
        if (error) {
          console.error("Database error fetching extra:", error);
          return res.status(500).json({ error: "Server error" });
        }
        if (!results.length) {
          return res.status(404).json({ error: "Extra not found" });
        }
        res.json(results[0]);
      }
    );
  });

  router.post("/", (req, res) => {
    const { name, price, description, charge_type } = req.body;
    const chargeType = charge_type === "once" ? "once" : "daily";

    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    db.query(
      "INSERT INTO extras (name, price, description, charge_type) VALUES (?, ?, ?, ?)",
      [name, price, description || null, chargeType],
      (error, result) => {
        if (error) {
          console.error("Database error creating extra:", error);
          return res.status(500).json({ error: "Server error" });
        }
        res.status(201).json({
          id: result.insertId,
          name,
          price,
          description: description || null,
          charge_type: chargeType,
        });
      }
    );
  });

  router.put("/:id", (req, res) => {
    const { name, price, description, charge_type } = req.body;
    const chargeType = charge_type === "once" ? "once" : "daily";

    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    db.query(
      "UPDATE extras SET name = ?, price = ?, description = ?, charge_type = ? WHERE id = ?",
      [name, price, description || null, chargeType, req.params.id],
      (error, result) => {
        if (error) {
          console.error("Database error updating extra:", error);
          return res.status(500).json({ error: "Server error" });
        }
        if (!result.affectedRows) {
          return res.status(404).json({ error: "Extra not found" });
        }
        res.json({
          id: req.params.id,
          name,
          price,
          description: description || null,
          charge_type: chargeType,
        });
      }
    );
  });

  router.delete("/:id", (req, res) => {
    db.query("DELETE FROM extras WHERE id = ?", [req.params.id], (error, result) => {
      if (error) {
        console.error("Database error deleting extra:", error);
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
