const express = require("express");
const router = express.Router();

function parseDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = (db) => {
  router.get("/", async (req, res) => {
    try {
      const plateNumber = String(req.query.plate_number || "").trim();
      const params = [];
      let where = "WHERE (cu.end_at IS NULL OR cu.end_at > NOW())";
      if (plateNumber) {
        where += " AND cu.plate_number = ?";
        params.push(plateNumber);
      }

      const [rows] = await db.promise().query(
        `SELECT
           cu.id,
           cu.plate_number,
           DATE_FORMAT(cu.start_at, '%Y-%m-%dT%H:%i') AS start_at,
           CASE
             WHEN cu.end_at IS NULL THEN NULL
             ELSE DATE_FORMAT(cu.end_at, '%Y-%m-%dT%H:%i')
           END AS end_at,
           cu.reason,
           cu.created_at,
           GROUP_CONCAT(DISTINCT r.id ORDER BY r.id) AS affected_reservation_ids
         FROM car_unavailability cu
         LEFT JOIN reservations r
           ON r.plate_number = cu.plate_number
          AND r.status IN ('Pending', 'Approved')
          AND TIMESTAMP(r.start_date, r.start_time) < COALESCE(cu.end_at, '9999-12-31 23:59:59')
          AND TIMESTAMP(r.end_date, r.end_time) > cu.start_at
         ${where}
         GROUP BY cu.id
         ORDER BY cu.start_at, cu.id`,
        params
      );

      return res.json(rows.map((row) => ({
        ...row,
        affected_reservation_ids: row.affected_reservation_ids
          ? String(row.affected_reservation_ids).split(",").map(Number)
          : [],
      })));
    } catch (error) {
      console.error("Could not load car unavailability:", error);
      return res.status(500).json({ error: "Could not load vehicle unavailability." });
    }
  });

  router.post("/", async (req, res) => {
    const plateNumber = String(req.body.plate_number || "").trim();
    const startAt = parseDateTime(req.body.start_at);
    const endAt = req.body.end_at ? parseDateTime(req.body.end_at) : null;
    const reason = String(req.body.reason || "").trim();

    if (!plateNumber || !startAt || !reason || (req.body.end_at && !endAt)) {
      return res.status(400).json({ error: "Vehicle, start time, and reason are required." });
    }
    if (endAt && endAt <= startAt) {
      return res.status(400).json({ error: "The availability end must be after its start." });
    }

    let connection;
    const lockName = `reservation:${plateNumber}`;
    let hasLock = false;
    try {
      connection = await db.promise().getConnection();
      const [lockRows] = await connection.query("SELECT GET_LOCK(?, 5) AS acquired", [lockName]);
      hasLock = Number(lockRows[0]?.acquired) === 1;
      if (!hasLock) {
        return res.status(409).json({ error: "This vehicle is currently being updated. Please try again." });
      }

      const [carRows] = await connection.query(
        "SELECT plate_number FROM cars WHERE plate_number = ?",
        [plateNumber]
      );
      if (!carRows.length) return res.status(404).json({ error: "Vehicle not found." });

      const [overlaps] = await connection.query(
        `SELECT id FROM car_unavailability
          WHERE plate_number = ?
            AND start_at < COALESCE(?, '9999-12-31 23:59:59')
            AND (end_at IS NULL OR end_at > ?)
          LIMIT 1`,
        [plateNumber, endAt, startAt]
      );
      if (overlaps.length) {
        return res.status(409).json({ error: "This vehicle already has an overlapping unavailable period." });
      }

      const [insertResult] = await connection.query(
        `INSERT INTO car_unavailability (plate_number, start_at, end_at, reason)
         VALUES (?, ?, ?, ?)`,
        [plateNumber, startAt, endAt, reason.slice(0, 255)]
      );
      const [affectedRows] = await connection.query(
        `SELECT id FROM reservations
          WHERE plate_number = ?
            AND status IN ('Pending', 'Approved')
            AND TIMESTAMP(start_date, start_time) < COALESCE(?, '9999-12-31 23:59:59')
            AND TIMESTAMP(end_date, end_time) > ?
          ORDER BY id`,
        [plateNumber, endAt, startAt]
      );

      return res.json({
        success: true,
        id: insertResult.insertId,
        affected_reservation_ids: affectedRows.map((row) => Number(row.id)),
      });
    } catch (error) {
      console.error("Could not mark vehicle unavailable:", error);
      return res.status(500).json({ error: "Could not mark the vehicle unavailable." });
    } finally {
      if (connection && hasLock) {
        try {
          await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
        } catch (error) {
          console.error("Could not release vehicle unavailability lock:", error);
        }
      }
      if (connection) connection.release();
    }
  });

  router.delete("/:id", async (req, res) => {
    try {
      const [result] = await db.promise().query(
        "DELETE FROM car_unavailability WHERE id = ?",
        [Number(req.params.id)]
      );
      if (!result.affectedRows) return res.status(404).json({ error: "Unavailable period not found." });
      return res.json({ success: true });
    } catch (error) {
      console.error("Could not remove car unavailability:", error);
      return res.status(500).json({ error: "Could not make the vehicle available." });
    }
  });

  return router;
};
