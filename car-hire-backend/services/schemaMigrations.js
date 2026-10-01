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

async function ensureIndex(connection, tableName, indexName, columns) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS index_count
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?`,
    [tableName, indexName]
  );
  if (Number(rows[0]?.index_count || 0) > 0) return;

  await connection.query(
    `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columns})`
  );
  console.log(`Database migration added index ${tableName}.${indexName}`);
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
      "expires_at",
      "DATETIME NULL AFTER `status`"
    );
    await ensureIndex(
      connection,
      "reservations",
      "idx_reservations_active_period",
      "`plate_number`, `status`, `expires_at`, `start_date`, `end_date`"
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
