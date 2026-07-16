// routes/cars.js
const express = require("express");
const router = express.Router();

module.exports = (db, upload) => {
  // We can define this helper function here:
  function formatDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm   = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd   = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // ------------------------------------------
  // 1) /api/cars/available
  // ------------------------------------------
 router.get("/available", (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Missing startDate or endDate" });
  }

  const sql = `
    SELECT * FROM cars 
    WHERE plate_number NOT IN (
      SELECT plate_number FROM reservations
      WHERE (start_date <= ? AND end_date >= ?)
      AND status IN ('Pending', 'Approved')
    )
  `;

  db.query(sql, [endDate, startDate], (err, results) => {
    if (err) {
      console.error("GET /api/cars/available error:", err);
      return res.status(500).send(err.message);
    }
    res.json(results);
  });
});

  // ------------------------------------------
  // 2) /api/cars/availability
  //    GET ?year=YYYY&month=MM
  // ------------------------------------------
  router.get("/availability", (req, res) => {
    const yearParam  = parseInt(req.query.year, 10);
    const monthParam = parseInt(req.query.month, 10);

    if (!yearParam || !monthParam || monthParam < 1 || monthParam > 12) {
      return res
        .status(400)
        .json({ error: "Please provide valid 'year' and 'month' (1..12)." });
    }

    const startDate = new Date(yearParam, monthParam - 1, 1);  // JS months: 0-based
    const endDate   = new Date(yearParam, monthParam, 0);      // day=0 => last day of month
    const startStr  = formatDate(startDate);
    const endStr    = formatDate(endDate);

    const sql = `
      WITH RECURSIVE allDays (day) AS (
         SELECT ? AS day
         UNION ALL
         SELECT DATE_ADD(day, INTERVAL 1 DAY)
         FROM allDays
         WHERE day < ?
      ),
      totalCars AS (
         SELECT COUNT(*) AS total FROM cars
      )
      SELECT 
         allDays.day AS date,
         totalCars.total - COUNT(r.id) AS freeCars
      FROM allDays
      CROSS JOIN totalCars
      LEFT JOIN reservations r
             ON r.status IN ('Pending','Approved')
            AND r.start_date <= allDays.day
            AND r.end_date   >= allDays.day
      GROUP BY allDays.day, totalCars.total
      ORDER BY allDays.day
    `;

    db.query(sql, [startStr, endStr], (err, results) => {
      if (err) {
        console.error("Error in availability query:", err);
        return res
          .status(500)
          .json({ error: "Database error in availability query." });
      }
      res.json(results);
    });
  });

  // ------------------------------------------
  // 3) /api/cars/caravailability/:plateNumber
  // ------------------------------------------
  router.get("/caravailability/:plateNumber", (req, res) => {
    const plateNumber = req.params.plateNumber;
    const sql = `
      SELECT start_date, end_date
        FROM reservations
       WHERE plate_number = ?
         AND status IN ('Pending','Approved')
    `;

    db.query(sql, [plateNumber], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      const bookedRanges = results.map(row => ({
        start: formatDate(row.start_date),
        end:   formatDate(row.end_date)
      }));

      res.json(bookedRanges);
    });
  });

  // ------------------------------------------
  // 4) POST /api/cars
  // ------------------------------------------
  router.post("/", upload.single("carImage"), (req, res) => {
    const {
      carName,
      plateNumber,
      transmission,
      fuelType,
      doorCount,
      storageSpace,
      price,
    } = req.body;
    const carImage = req.file ? req.file.filename : null;

    db.query(
      `INSERT INTO cars 
       (plate_number, car_name, transmission, fuel_type, door_count, storage_space, car_image_url, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [plateNumber, carName, transmission, fuelType, doorCount, storageSpace, carImage, price],
      (err) => {
        if (err) {
          console.error("Error adding car:", err);
          return res
            .status(500)
            .json({ success: false, message: "Server error" });
        }
        res.json({ success: true, message: "Car added successfully" });
      }
    );
  });

  // ------------------------------------------
  // 5) PUT /api/cars/:plateNumber
  // ------------------------------------------
  router.put("/:plateNumber", upload.single("carImage"), (req, res) => {
    const { plateNumber } = req.params;
    const {
      carName,
      transmission,
      fuelType,
      doorCount,
      storageSpace,
      price,
    } = req.body;
    const newCarImage = req.file ? req.file.filename : null;

    db.query("SELECT car_image_url FROM cars WHERE plate_number = ?", [plateNumber], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (results.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Car not found" });
      }
      const existingImage = results[0].car_image_url;
      const finalImage = newCarImage || existingImage;

      db.query(
        `UPDATE cars 
         SET car_name = ?, transmission = ?, fuel_type = ?, door_count = ?, storage_space = ?, price = ?, car_image_url = ? 
         WHERE plate_number = ?`,
        [carName, transmission, fuelType, doorCount, storageSpace, price, finalImage, plateNumber],
        (err2) => {
          if (err2) {
            console.error("Error updating car:", err2);
            return res
              .status(500)
              .json({ success: false, message: "Server error" });
          }
          res.json({ success: true, message: "Car updated successfully" });
        }
      );
    });
  });

  // ------------------------------------------
  // 6) GET /api/cars
  // ------------------------------------------
  router.get("/", (req, res) => {
  db.query("SELECT * FROM cars", (err, results) => {
    if (err) {
      console.error("GET /api/cars error:", err);
      return res.status(500).send(err.message);
    }
    res.json(results);
  });
});

  // ------------------------------------------
  // 7) GET /api/cars/available-for-edit
  //    GET ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&excludeReservationId=123
  // ------------------------------------------
  router.get("/available-for-edit", (req, res) => {
    const { startDate, endDate, excludeReservationId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "Missing startDate or endDate" });
    }

    const excludedId = Number(excludeReservationId || 0);

    const sql = `
      SELECT *
      FROM cars
      WHERE plate_number NOT IN (
        SELECT plate_number
        FROM reservations
        WHERE id <> ?
          AND status IN ('Pending', 'Approved')
          AND start_date <= ?
          AND end_date >= ?
      )
      ORDER BY car_name
    `;

    db.query(sql, [excludedId, endDate, startDate], (err, results) => {
      if (err) {
        console.error("GET /api/cars/available-for-edit error:", err);
        return res.status(500).json({ error: "Server error checking availability" });
      }

      res.json(results);
    });
  });

  // ------------------------------------------
  // 7) GET /api/cars/:plateNumber
  // ------------------------------------------
  router.get("/:plateNumber", (req, res) => {
    const plateNumber = req.params.plateNumber;
    db.query("SELECT * FROM cars WHERE plate_number = ?", [plateNumber], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "Car not found" });
      }
      res.json(results[0]);
    });
  });

  // ------------------------------------------
  // 8) DELETE /api/cars/:plateNumber
  // ------------------------------------------
  router.delete("/:plateNumber", (req, res) => {
    const { plateNumber } = req.params;
    db.query("DELETE FROM cars WHERE plate_number = ?", [plateNumber], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Server error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Car not found" });
      }
      res.json({ success: true, message: "Car removed successfully" });
    });
  });

  // Return the router
  return router;
};
