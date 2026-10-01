// routes/reservations.js
const express = require("express");
const router = express.Router();
const { sendConfirmedReservationEmail } = require("../services/confirmedReservationEmail");

module.exports = (db, { createReservationEditToken } = {}) => {
  function formatDate(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  router.get('/availability', (req, res) => {
    const yearParam = parseInt(req.query.year, 10);
    const monthParam = parseInt(req.query.month, 10);

    if (!yearParam || !monthParam || monthParam < 1 || monthParam > 12) {
      return res.status(400).json({ error: "Please provide valid 'year' and 'month' (1..12)." });
    }

    const startDate = new Date(yearParam, monthParam - 1, 1);
    const endDate = new Date(yearParam, monthParam, 0);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    db.query("SELECT plate_number FROM cars", (err, carRows) => {
      if (err) {
        console.error("Error fetching cars:", err);
        return res.status(500).json({ error: "Database error fetching cars." });
      }
      const allCars = carRows.map(row => row.plate_number);

      const sql = `
        WITH RECURSIVE allDays (day) AS (
          SELECT ? AS day
          UNION ALL
          SELECT DATE_ADD(day, INTERVAL 1 DAY)
          FROM allDays
          WHERE day < ?
        ),
        unavailableCars AS (
          SELECT allDays.day, r.plate_number
          FROM allDays
          JOIN reservations r
            ON r.status IN ('Pending','Approved')
           AND r.start_date <= allDays.day
           AND r.end_date >= allDays.day
          UNION
          SELECT allDays.day, cu.plate_number
          FROM allDays
          JOIN car_unavailability cu
            ON cu.start_at < DATE_ADD(allDays.day, INTERVAL 1 DAY)
           AND (cu.end_at IS NULL OR cu.end_at > allDays.day)
        )
        SELECT
          allDays.day AS date,
          IFNULL(GROUP_CONCAT(DISTINCT unavailableCars.plate_number), '') AS bookedCars
        FROM allDays
        LEFT JOIN unavailableCars ON unavailableCars.day = allDays.day
        GROUP BY allDays.day
        ORDER BY allDays.day
      `;

      db.query(sql, [startStr, endStr], (queryErr, dayRows) => {
        if (queryErr) {
          console.error("Error in availability query:", queryErr);
          return res.status(500).json({ error: 'Database error in availability query.' });
        }

        const result = dayRows.map(row => {
          const bookedSet = row.bookedCars ? row.bookedCars.split(',') : [];
          const available = allCars.filter(pn => !bookedSet.includes(pn));
          return {
            date: row.date,
            freeCars: available.length,
            availableCars: available
          };
        });
        res.json(result);
      });
    });
  });

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

    query += " ORDER BY start_date DESC, start_time DESC, id DESC";

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Server error" });
      }

      results.forEach((row) => {
        if (row.start_date) row.start_date = formatDate(row.start_date);
        if (row.end_date) row.end_date = formatDate(row.end_date);
        row.extras = [];
      });

      if (!results.length) {
        return res.json(results);
      }

      const reservationIds = results.map((row) => row.id);
      const placeholders = reservationIds.map(() => "?").join(",");
      const extrasQuery = `
        SELECT
          re.reservation_id,
          re.extra_id,
          re.days,
          re.price_at_booking,
          e.name,
          e.charge_type,
          e.price
        FROM reservation_extras re
        LEFT JOIN extras e ON e.id = re.extra_id
        WHERE re.reservation_id IN (${placeholders})
        ORDER BY re.reservation_id, re.extra_id
      `;

      db.query(extrasQuery, reservationIds, (extrasErr, extraRows) => {
        if (extrasErr) {
          console.error("Error loading reservation extras:", extrasErr);
          return res.status(500).json({ error: "Server error loading reservation extras" });
        }

        const reservationsById = new Map(
          results.map((reservation) => [Number(reservation.id), reservation])
        );

        extraRows.forEach((extra) => {
          const reservation = reservationsById.get(Number(extra.reservation_id));
          if (reservation) reservation.extras.push(extra);
        });

        return res.json(results);
      });
    });
  });

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

  router.post("/", async (req, res) => {
    const {
      customer_name, customer_email, customer_phone, flight_number, plate_number,
      start_date, start_time, end_date, end_time, pickup_location, dropoff_location,
      total_price, calculated_price, price_override, price_override_reason,
      status, extras, notes
    } = req.body;
    const allowedStatuses = new Set(["Pending", "Approved", "Completed", "Cancelled"]);
    const safeStatus =
      req.session.userId && allowedStatuses.has(status) ? status : "Pending";
    let connection;

    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO reservations
         (customer_name, customer_email, customer_phone, flight_number, plate_number,
          start_date, start_time, end_date, end_time, pickup_location, dropoff_location,
          total_price, calculated_price, price_override, price_override_reason,
          status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_name, customer_email, customer_phone, flight_number, plate_number,
          start_date, start_time, end_date, end_time, pickup_location || "",
          dropoff_location || "", total_price, calculated_price, price_override,
          price_override_reason || "", safeStatus, notes || ""
        ]
      );

      const reservationId = result.insertId;
      if (Array.isArray(extras) && extras.length > 0) {
        const extraRows = extras.map((extra) => [
          reservationId, extra.extra_id, extra.days, extra.price_at_booking
        ]);
        await connection.query(
          `INSERT INTO reservation_extras
           (reservation_id, extra_id, days, price_at_booking) VALUES ?`,
          [extraRows]
        );
      }

      await connection.commit();
      return res.json({ success: true, reservationId });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Reservation creation rollback failed:", rollbackError);
        }
      }
      console.error("Reservation creation failed:", error);
      return res.status(500).json({ error: "Server error creating reservation." });
    } finally {
      if (connection) connection.release();
    }
  });

  // Dedicated status change endpoint. This never recalculates pricing or touches extras.
  router.patch("/:id/status", (req, res) => {
    const reservationId = Number(req.params.id);
    const newStatus = String(req.body.status || "").trim();
    const allowedStatuses = new Set(["Pending", "Approved", "Completed", "Cancelled"]);

    if (!reservationId || !allowedStatuses.has(newStatus)) {
      return res.status(400).json({ success: false, error: "Invalid reservation status." });
    }

    db.query(
      "SELECT status FROM reservations WHERE id = ?",
      [reservationId],
      (lookupErr, rows) => {
        if (lookupErr) {
          console.error("Status lookup error:", lookupErr);
          return res.status(500).json({ success: false, error: "Could not update reservation status." });
        }
        if (!rows.length) {
          return res.status(404).json({ success: false, error: "Reservation not found." });
        }

        const previousStatus = rows[0].status;
        if (previousStatus === newStatus) {
          return res.json({ success: true, reservationId, status: newStatus, emailSent: false, unchanged: true });
        }

        db.query(
          "UPDATE reservations SET status = ? WHERE id = ?",
          [newStatus, reservationId],
          async (updateErr) => {
            if (updateErr) {
              console.error("Status update error:", updateErr);
              return res.status(500).json({ success: false, error: "Could not update reservation status." });
            }

            let emailSent = false;
            let emailConfigured = true;
            let emailError = "";

            if (newStatus === "Approved" && previousStatus !== "Approved") {
              try {
                const result = await sendConfirmedReservationEmail(db, reservationId);
                emailConfigured = result.configured;
                emailSent = result.sent;
              } catch (error) {
                emailError = error instanceof Error ? error.message : String(error);
                console.error(`Reservation #${reservationId} approval email failed:`, error);
              }
            }

            res.json({
              success: true,
              reservationId,
              previousStatus,
              status: newStatus,
              emailConfigured,
              emailSent,
              emailError,
            });
          }
        );
      }
    );
  });

  router.put("/:id", async (req, res) => {
    const reservationId = Number(req.params.id);
    const {
      customer_name, customer_email, customer_phone, flight_number, plate_number,
      start_date, start_time, end_date, end_time, pickup_location, dropoff_location,
      total_price, calculated_price, price_override, price_override_reason,
      status, extras, notes
    } = req.body;
    const allowedStatuses = new Set(["Pending", "Approved", "Completed", "Cancelled"]);
    const safeStatus =
      req.session.userId && allowedStatuses.has(status) ? status : "Pending";
    let connection;

    try {
      connection = await db.promise().getConnection();
      await connection.beginTransaction();

      const [existingRows] = await connection.query(
        "SELECT id FROM reservations WHERE id = ? FOR UPDATE",
        [reservationId]
      );
      if (!existingRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Reservation not found." });
      }

      await connection.query(
        `UPDATE reservations SET
         customer_name=?, customer_email=?, customer_phone=?, flight_number=?, plate_number=?,
         start_date=?, start_time=?, end_date=?, end_time=?, pickup_location=?,
         dropoff_location=?, total_price=?, calculated_price=?, price_override=?,
         price_override_reason=?, status=?, notes=?
         WHERE id=?`,
        [
          customer_name, customer_email, customer_phone, flight_number, plate_number,
          start_date, start_time, end_date, end_time, pickup_location || "",
          dropoff_location || "", total_price, calculated_price, price_override,
          price_override_reason || "", safeStatus, notes || "", reservationId
        ]
      );

      await connection.query(
        "DELETE FROM reservation_extras WHERE reservation_id = ?",
        [reservationId]
      );

      if (Array.isArray(extras) && extras.length > 0) {
        const extraRows = extras.map((extra) => [
          reservationId, extra.extra_id, extra.days, extra.price_at_booking
        ]);
        await connection.query(
          `INSERT INTO reservation_extras
           (reservation_id, extra_id, days, price_at_booking) VALUES ?`,
          [extraRows]
        );
      }

      await connection.commit();
      return res.json({ success: true, reservationId });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error("Reservation update rollback failed:", rollbackError);
        }
      }
      console.error("Reservation update failed:", error);
      return res.status(500).json({ error: "Server error updating reservation." });
    } finally {
      if (connection) connection.release();
    }
  });

  router.delete("/:id", (req, res) => {
    const reservationId = req.params.id;

    db.query(
      "DELETE FROM reservation_extras WHERE reservation_id = ?",
      [reservationId],
      (err) => {
        if (err) {
          console.error("Error deleting reservation extras:", err);
          return res.status(500).json({ error: "Server error deleting reservation extras" });
        }

        db.query(
          "DELETE FROM reservations WHERE id = ?",
          [reservationId],
          (deleteErr, result) => {
            if (deleteErr) {
              console.error("Database error:", deleteErr);
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
