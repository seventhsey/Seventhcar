// routes/reservations.js
const express = require("express");
const router = express.Router();

module.exports = (db, { createReservationEditToken } = {}) => {

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

  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime());
  }

  function isValidTime(value) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || "").slice(0, 5));
  }

  function validateReservationInput(data) {
    const required = [
      "customer_name",
      "customer_email",
      "customer_phone",
      "plate_number",
      "start_date",
      "start_time",
      "end_date",
      "end_time",
    ];

    if (required.some((key) => !String(data[key] || "").trim())) {
      throw Object.assign(new Error("Required reservation details are missing."), {
        statusCode: 400,
      });
    }

    if (
      !isValidDate(data.start_date) ||
      !isValidDate(data.end_date) ||
      !isValidTime(data.start_time) ||
      !isValidTime(data.end_time)
    ) {
      throw Object.assign(new Error("Reservation date or time is invalid."), {
        statusCode: 400,
      });
    }

    const start = new Date(`${data.start_date}T${String(data.start_time).slice(0, 5)}:00`);
    const end = new Date(`${data.end_date}T${String(data.end_time).slice(0, 5)}:00`);
    if (end <= start) {
      throw Object.assign(new Error("Return must be after pickup."), {
        statusCode: 400,
      });
    }
  }

  async function calculateAuthoritativePrice(data) {
    validateReservationInput(data);

    const [carRows] = await db.promise().query(
      "SELECT price FROM cars WHERE plate_number = ?",
      [data.plate_number]
    );

    if (!carRows.length) {
      throw Object.assign(new Error("Selected vehicle was not found."), {
        statusCode: 400,
      });
    }

    const days = calculateBookingDays(
      data.start_date,
      String(data.start_time).slice(0, 5),
      data.end_date,
      String(data.end_time).slice(0, 5)
    );

    const requestedExtras = Array.isArray(data.extras) ? data.extras : [];
    if (requestedExtras.length > 30) {
      throw Object.assign(new Error("Too many extras were supplied."), {
        statusCode: 400,
      });
    }

    const quantities = new Map();
    for (const item of requestedExtras) {
      const id = Number(item.extra_id);
      const qty = Number(item.qty ?? 1);
      if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw Object.assign(new Error("An extra or its quantity is invalid."), {
          statusCode: 400,
        });
      }
      quantities.set(id, (quantities.get(id) || 0) + qty);
      if (quantities.get(id) > 10) {
        throw Object.assign(new Error("Extra quantity cannot exceed 10."), {
          statusCode: 400,
        });
      }
    }

    const extraIds = Array.from(quantities.keys());
    let extraRows = [];
    if (extraIds.length) {
      const placeholders = extraIds.map(() => "?").join(",");
      const [rows] = await db.promise().query(
        `SELECT id, price, charge_type FROM extras WHERE id IN (${placeholders})`,
        extraIds
      );
      extraRows = rows;

      if (rows.length !== extraIds.length) {
        throw Object.assign(new Error("One or more selected extras no longer exist."), {
          statusCode: 400,
        });
      }
    }

    const carTotal =
      days * Number(carRows[0].price || 0) * getTierMultiplier(days);

    let extrasTotal = 0;
    const pricedExtras = extraRows.map((extra) => {
      const qty = quantities.get(Number(extra.id));
      const unitPrice = Number(extra.price || 0);
      const chargedDays = extra.charge_type === "once" ? 1 : days;
      extrasTotal += unitPrice * qty * chargedDays;

      return {
        extra_id: Number(extra.id),
        days: chargedDays,
        price_at_booking: Number((unitPrice * qty).toFixed(2)),
      };
    });

    return {
      totalPrice: Number((carTotal + extrasTotal).toFixed(2)),
      pricedExtras,
    };
  }

  function sendReservationError(res, error, fallbackMessage) {
    console.error(fallbackMessage, error);
    return res
      .status(error.statusCode || 500)
      .json({ error: error.statusCode ? error.message : fallbackMessage });
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

    // Show reservations with the latest pickup date/time first by default.
    // The ID keeps the result deterministic when dates and times are identical.
    query += " ORDER BY start_date DESC, start_time DESC, id DESC";

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

// POST /api/reservations/lookup
  router.post("/lookup", (req, res) => {
    const reservationId = Number(req.body.reservation_id);
    const surname = String(req.body.surname || "").trim().toLowerCase();

    if (!reservationId || !surname) {
      return res.status(400).json({
        success: false,
        error: "Reservation ID and surname are required.",
      });
    }

    db.query(
      "SELECT * FROM reservations WHERE id = ?",
      [reservationId],
      (err, results) => {
        if (err) {
          console.error("Lookup reservation error:", err);
          return res.status(500).json({
            success: false,
            error: "Server error looking up reservation.",
          });
        }

        if (!results.length) {
          return res.status(404).json({
            success: false,
            error: "Reservation not found.",
          });
        }

        const reservation = results[0];

        const nameParts = String(reservation.customer_name || "")
          .trim()
          .toLowerCase()
          .split(/\s+/);

        const storedSurname = nameParts[nameParts.length - 1] || "";

        if (storedSurname !== surname) {
          return res.status(404).json({
            success: false,
            error: "Reservation not found.",
          });
        }

        if (["Cancelled", "Completed"].includes(reservation.status)) {
          return res.status(409).json({
            success: false,
            error: "This reservation can no longer be edited online.",
          });
        }

        if (reservation.start_date) reservation.start_date = formatDate(reservation.start_date);
        if (reservation.end_date) reservation.end_date = formatDate(reservation.end_date);

        db.query(
          `
          SELECT
            re.extra_id,
            e.name,
            e.charge_type,
            e.price AS current_price,
            re.days,
            re.price_at_booking
          FROM reservation_extras re
          LEFT JOIN extras e
            ON re.extra_id = e.id
          WHERE re.reservation_id = ?
          `,
          [reservationId],
          (extrasErr, extras) => {
            if (extrasErr) {
              console.error("Lookup extras error:", extrasErr);
              return res.status(500).json({
                success: false,
                error: "Server error loading reservation extras.",
              });
            }

            db.query(
              "SELECT * FROM cars WHERE plate_number = ?",
              [reservation.plate_number],
              (carErr, carRows) => {
                if (carErr) {
                  console.error("Lookup car error:", carErr);
                  return res.status(500).json({
                    success: false,
                    error: "Server error loading reservation car.",
                  });
                }

                res.json({
                  success: true,
                  reservation,
                  extras,
                  car: carRows[0] || null,
                  edit_token: createReservationEditToken
                    ? createReservationEditToken(reservationId)
                    : null,
                });
              }
            );
          }
        );
      }
    );
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
  // PATCH /api/reservations/:id/status (admin session required)
  router.patch("/:id/status", (req, res) => {
    const reservationId = Number(req.params.id);
    const allowedStatuses = new Set([
      "Pending",
      "Approved",
      "Completed",
      "Cancelled",
    ]);
    const status = String(req.body.status || "");

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ error: "Invalid reservation ID." });
    }
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ error: "Invalid reservation status." });
    }

    db.query(
      "UPDATE reservations SET status = ? WHERE id = ?",
      [status, reservationId],
      (error, result) => {
        if (error) {
          console.error("Server error updating reservation status:", error);
          return res.status(500).json({ error: "Server error updating reservation status." });
        }
        if (!result.affectedRows) {
          return res.status(404).json({ error: "Reservation not found." });
        }
        return res.json({ success: true, reservationId, status });
      }
    );
  });

  // POST /api/reservations
  router.post("/", async (req, res) => {
    const data = req.body;
    let connection;

    try {
      const { totalPrice, pricedExtras } =
        await calculateAuthoritativePrice(data);

      const allowedStatuses = new Set([
        "Pending",
        "Approved",
        "Completed",
        "Cancelled",
      ]);
      const creationStatus =
        req.session.userId && allowedStatuses.has(String(data.status || ""))
          ? String(data.status)
          : "Pending";

      connection = db.promise();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO reservations
         (customer_name, customer_email, customer_phone, flight_number, plate_number,
          start_date, start_time, end_date, end_time, total_price, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(data.customer_name).trim(),
          String(data.customer_email).trim().toLowerCase(),
          String(data.customer_phone).trim(),
          String(data.flight_number || "").trim(),
          data.plate_number,
          data.start_date,
          String(data.start_time).slice(0, 5),
          data.end_date,
          String(data.end_time).slice(0, 5),
          totalPrice,
          creationStatus,
          String(data.notes || "").trim(),
        ]
      );

      const reservationId = result.insertId;

      if (pricedExtras.length) {
        const rows = pricedExtras.map((extra) => [
          reservationId,
          extra.extra_id,
          extra.days,
          extra.price_at_booking,
        ]);

        await connection.query(
          `INSERT INTO reservation_extras
           (reservation_id, extra_id, days, price_at_booking)
           VALUES ?`,
          [rows]
        );
      }

      await connection.commit();
      return res.json({
        success: true,
        reservationId,
        total_price: totalPrice,
      });
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch (rollbackError) {
          console.error("Reservation rollback failed:", rollbackError);
        }
      }
      return sendReservationError(
        res,
        error,
        "Server error creating reservation."
      );
    }
  });


  // PUT /api/reservations/:id
  router.put("/:id", async (req, res) => {
    const reservationId = Number(req.params.id);
    const data = req.body;
    let connection;

    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ error: "Invalid reservation ID." });
    }

    try {
      const { totalPrice, pricedExtras } =
        await calculateAuthoritativePrice(data);

      const [existingRows] = await db.promise().query(
        "SELECT status FROM reservations WHERE id = ?",
        [reservationId]
      );

      if (!existingRows.length) {
        return res.status(404).json({ error: "Reservation not found." });
      }

      const allowedStatuses = new Set([
        "Pending",
        "Approved",
        "Completed",
        "Cancelled",
      ]);
      const requestedStatus = String(data.status || "");
      const status =
        req.session.userId && allowedStatuses.has(requestedStatus)
          ? requestedStatus
          : existingRows[0].status;

      connection = db.promise();
      await connection.beginTransaction();

      await connection.query(
        `UPDATE reservations SET
         customer_name=?, customer_email=?, customer_phone=?, flight_number=?,
         plate_number=?, start_date=?, start_time=?, end_date=?, end_time=?,
         total_price=?, status=?, notes=?
         WHERE id=?`,
        [
          String(data.customer_name).trim(),
          String(data.customer_email).trim().toLowerCase(),
          String(data.customer_phone).trim(),
          String(data.flight_number || "").trim(),
          data.plate_number,
          data.start_date,
          String(data.start_time).slice(0, 5),
          data.end_date,
          String(data.end_time).slice(0, 5),
          totalPrice,
          status,
          String(data.notes || "").trim(),
          reservationId,
        ]
      );

      await connection.query(
        "DELETE FROM reservation_extras WHERE reservation_id = ?",
        [reservationId]
      );

      if (pricedExtras.length) {
        const rows = pricedExtras.map((extra) => [
          reservationId,
          extra.extra_id,
          extra.days,
          extra.price_at_booking,
        ]);

        await connection.query(
          `INSERT INTO reservation_extras
           (reservation_id, extra_id, days, price_at_booking)
           VALUES ?`,
          [rows]
        );
      }

      await connection.commit();
      return res.json({
        success: true,
        reservationId,
        total_price: totalPrice,
      });
    } catch (error) {
      if (connection) {
        try { await connection.rollback(); } catch (rollbackError) {
          console.error("Reservation rollback failed:", rollbackError);
        }
      }
      return sendReservationError(
        res,
        error,
        "Server error updating reservation."
      );
    }
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

