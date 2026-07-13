// routes/reservations.js
const express = require("express");
const router = express.Router();

module.exports = (db) => {

  function formatDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function calculateBookingDays(startDate, startTime, endDate, endTime) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    let days =
      Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (endTime > startTime) {
      days += 1;
    }

    return Math.max(1, days);
  }

  function getTierMultiplier(days) {
    if (days === 1) return 1.5;
    if (days <= 3) return 1.25;
    if (days <= 6) return 1.11;
    if (days <= 10) return 1.0;
    if (days <= 14) return 0.9;
    if (days <= 21) return 0.8;
    return 0.7;
  }

  router.get('/availability', (req, res) => {
    const yearParam = parseInt(req.query.year, 10);
    const monthParam = parseInt(req.query.month, 10);

    if (!yearParam || !monthParam || monthParam < 1 || monthParam > 12) {
      return res.status(400).json({ error: "Please provide valid 'year' and 'month' (1..12)." });
    }

    const startDate = new Date(yearParam, monthParam - 1, 1); // JS months are 0-based
    const endDate = new Date(yearParam, monthParam, 0); // day=0 => last day of that month
    const startStr = formatDate(startDate); // 'YYYY-MM-DD'
    const endStr = formatDate(endDate);

    // 1. Get ALL car plate numbers
    db.query("SELECT plate_number FROM cars", (err, carRows) => {
      if (err) {
        console.error("Error fetching cars:", err);
        return res.status(500).json({ error: "Database error fetching cars." });
      }
      const allCars = carRows.map(row => row.plate_number);

      // 2. For each day, find booked cars (pending/approved) and subtract from all cars
      const sql = `
      WITH RECURSIVE allDays (day) AS (
        SELECT ? AS day
        UNION ALL
        SELECT DATE_ADD(day, INTERVAL 1 DAY)
        FROM allDays
        WHERE day < ?
      )
      SELECT
        allDays.day AS date,
        IFNULL(GROUP_CONCAT(DISTINCT r.plate_number), '') AS bookedCars
      FROM allDays
      LEFT JOIN reservations r
        ON r.status IN ('Pending','Approved')
        AND r.start_date <= allDays.day
        AND r.end_date >= allDays.day
      GROUP BY allDays.day
      ORDER BY allDays.day
    `;
      db.query(sql, [startStr, endStr], (err, dayRows) => {
        if (err) {
          console.error("Error in availability query:", err);
          return res.status(500).json({ error: 'Database error in availability query.' });
        }

        // Build the response
        const result = dayRows.map(row => {
          // bookedCars will be a comma-separated string or ''
          const bookedSet = row.bookedCars ? row.bookedCars.split(',') : [];
          const available = allCars.filter(pn => !bookedSet.includes(pn));
          return {
            date: row.date,
            freeCars: available.length,
            availableCars: available // array of plate numbers
          };
        });
        res.json(result);
      });
    });
  });



  // GET /api/reservations
  router.get("/", (req, res) => {
    const { status, plate_number } = req.query;
    let query = "SELECT * FROM reservations";
    const conditions = [];
    const queryParams = [];

    if (status) {
      conditions.push("status = ?");
      queryParams.push(status);
    }

    if (plate_number) {
      conditions.push("plate_number = ?");
      queryParams.push(plate_number);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }
      results.forEach((row) => {
        if (row.start_date) row.start_date = formatDate(row.start_date);
        if (row.end_date) row.end_date = formatDate(row.end_date);
      });
      res.json(results);
    });
  });

  // GET /api/reservations/:id
  router.get("/:id", (req, res) => {
    const reservationId = req.params.id;
    db.query("SELECT * FROM reservations WHERE id = ?", [reservationId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }
      if (!results.length) {
        return res.status(404).json({ error: "Reservation not found" });
      }
      const reservation = results[0];
      reservation.start_date = formatDate(reservation.start_date);
      reservation.end_date = formatDate(reservation.end_date);
      res.json(reservation);
    });
  });

  //get extras 
  router.get("/:id/extras", (req, res) => {
    const reservationId = req.params.id;

    db.query(
      `
    SELECT
  re.extra_id,
  e.name,
  e.charge_type,
  re.days,
  re.price_at_booking
    FROM reservation_extras re
    LEFT JOIN extras e
      ON re.extra_id = e.id
    WHERE re.reservation_id = ?
    `,
      [reservationId],
      (err, results) => {
        if (err) {
          console.error("Error fetching reservation extras:", err);
          return res.status(500).json({ error: "Error fetching extras" });
        }

        res.json(results);
      }
    );
  });
  // POST /api/reservations
  router.post("/", (req, res) => {
    const {
      customer_name, customer_email, customer_phone, flight_number, plate_number,
      start_date, start_time, end_date, end_time, total_price, status, extras, notes
    } = req.body;

    db.query(
      `INSERT INTO reservations
   (customer_name, customer_email, customer_phone, flight_number, plate_number, 
   start_date, start_time, end_date, end_time, total_price, status, notes) 
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_email, customer_phone, flight_number, plate_number,
        start_date, start_time, end_date, end_time, total_price, status, notes || ""],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Server error creating reservation." });

        const reservationId = result.insertId;

        // Handle extras
        if (extras && extras.length > 0) {
          const extraQueries = extras.map(extra => [
            reservationId, extra.extra_id, extra.days, extra.price_at_booking
          ]);

          db.query(
            `INSERT INTO reservation_extras (reservation_id, extra_id, days, price_at_booking) VALUES ?`,
            [extraQueries],
            (err) => {
              if (err) console.error("Error inserting extras:", err);
            }
          );
        }
        res.json({ success: true, reservationId });
      }
    );
  });


  // PUT /api/reservations/:id
  router.put("/:id", (req, res) => {
    const reservationId = req.params.id;
    const {
      customer_name, customer_email, customer_phone, flight_number, plate_number,
      start_date, start_time, end_date, end_time, total_price, status, extras, notes
    } = req.body;

    db.query(
      `UPDATE reservations SET
   customer_name=?, customer_email=?, customer_phone=?, flight_number=?, plate_number=?,
   start_date=?, start_time=?, end_date=?, end_time=?, total_price=?, status=?, notes=?
   WHERE id=?`,
      [
        customer_name,
        customer_email,
        customer_phone,
        flight_number,
        plate_number,
        start_date,
        start_time,
        end_date,
        end_time,
        total_price,
        status,
        notes || "",
        reservationId
      ],
      (err) => {
        if (err) return res.status(500).json({ error: "Server error updating reservation." });

        // First clear existing extras
        db.query(
          `DELETE FROM reservation_extras WHERE reservation_id = ?`,
          [reservationId],
          (deleteErr) => {
            if (deleteErr) console.error("Error deleting extras:", deleteErr);

            // Insert new extras
            if (extras && extras.length > 0) {
              const extraQueries = extras.map(extra => [
                reservationId, extra.extra_id, extra.days, extra.price_at_booking
              ]);

              db.query(
                `INSERT INTO reservation_extras (reservation_id, extra_id, days, price_at_booking) VALUES ?`,
                [extraQueries],
                (insertErr) => {
                  if (insertErr) console.error("Error inserting extras:", insertErr);
                }
              );
            }
          }
        );

        res.json({ success: true, reservationId });
      }
    );
  });

  // Another PUT route for status changes? Or combine them. Up to you.
  // DELETE /api/reservations/:id
  // DELETE /api/reservations/:id
  router.delete("/:id", (req, res) => {
    const reservationId = req.params.id;

    // 1) Remove any extras linked to this reservation
    db.query(
      "DELETE FROM reservation_extras WHERE reservation_id = ?",
      [reservationId],
      (err) => {
        if (err) {
          console.error("Error deleting reservation extras:", err);
          return res.status(500).json({ error: "Server error deleting reservation extras" });
        }

        // 2) Now delete the reservation itself
        db.query(
          "DELETE FROM reservations WHERE id = ?",
          [reservationId],
          (err, result) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ error: "Server error deleting reservation" });
            }
            if (!result.affectedRows) {
              return res.status(404).json({ error: "Reservation not found" });
            }
            res.json({ success: true, message: "Reservation and related extras deleted" });
          }
        );
      }
    );
  });







  return router;
};

