async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS column_count
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.column_count || 0) > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  if (await columnExists(connection, tableName, columnName)) return;
  await connection.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
  );
  console.log(`Database migration added ${tableName}.${columnName}`);
}

async function initializeSchema(pool) {
  const connection = await pool.promise().getConnection();
  const lockName = "seventhcar:schema-migrations";
  let hasLock = false;

  try {
    const [lockRows] = await connection.query(
      "SELECT GET_LOCK(?, 30) AS acquired",
      [lockName]
    );
    hasLock = Number(lockRows[0]?.acquired) === 1;
    if (!hasLock) {
      throw new Error("Timed out waiting for the database migration lock.");
    }

    if (!(await columnExists(connection, "users", "account_role"))) {
      await ensureColumn(connection, "users", "account_role", "VARCHAR(16) NOT NULL DEFAULT 'admin'");
    }
    // Also recover safely if a previous startup stopped just after adding the column.
    const [owners] = await connection.query("SELECT id FROM users WHERE account_role = 'owner' LIMIT 1");
    if (!owners.length) {
      const [users] = await connection.query("SELECT id FROM users ORDER BY id LIMIT 1");
      if (users.length) await connection.query("UPDATE users SET account_role = 'owner' WHERE id = ?", [users[0].id]);
    }
    await ensureColumn(connection, "users", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
    await ensureColumn(connection, "users", "password_version", "INT UNSIGNED NOT NULL DEFAULT 0");

    if (!(await columnExists(connection, "extras", "max_quantity"))) {
      await ensureColumn(connection, "extras", "max_quantity", "SMALLINT UNSIGNED NOT NULL DEFAULT 1");
      // Preserve existing seat limits once; all future limits belong to the extra record.
      await connection.query(`UPDATE extras SET max_quantity = 3
        WHERE id IN (4, 5) OR LOWER(name) LIKE '%baby seat%' OR LOWER(name) LIKE '%child seat%'`);
    }

    await ensureColumn(
      connection,
      "reservations",
      "pickup_location",
      "VARCHAR(255) NULL AFTER `end_time`"
    );
    await ensureColumn(
      connection,
      "reservations",
      "dropoff_location",
      "VARCHAR(255) NULL AFTER `pickup_location`"
    );
    await ensureColumn(
      connection,
      "reservations",
      "calculated_price",
      "DECIMAL(10,2) NULL AFTER `total_price`"
    );
    await ensureColumn(
      connection,
      "reservations",
      "price_override",
      "DECIMAL(10,2) NULL AFTER `calculated_price`"
    );
    await ensureColumn(
      connection,
      "reservations",
      "price_override_reason",
      "VARCHAR(255) NULL AFTER `price_override`"
    );
    await ensureColumn(connection, "reservations", "cancellation_reason", "TEXT NULL");
    await connection.query(
      `CREATE TABLE IF NOT EXISTS car_unavailability (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        plate_number VARCHAR(255) NOT NULL,
        start_at DATETIME NOT NULL,
        end_at DATETIME NULL,
        reason VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_car_unavailability_period (plate_number, start_at, end_at)
      )`
    );
  } finally {
    if (hasLock) {
      try {
        await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
      } catch (error) {
        console.error("Could not release database migration lock:", error);
      }
    }
    connection.release();
  }
}

module.exports = { initializeSchema };
