const DEFAULT_PENDING_HOURS = 24;
const EXPIRY_CHECK_INTERVAL_MS = 15 * 60 * 1000;

function getPendingReservationHours() {
  const configured = Number(process.env.PENDING_RESERVATION_HOURS);
  if (!Number.isFinite(configured)) return DEFAULT_PENDING_HOURS;
  return Math.min(168, Math.max(1, Math.round(configured)));
}

function createPendingExpiry(status) {
  if (status !== "Pending") return null;
  return new Date(Date.now() + getPendingReservationHours() * 60 * 60 * 1000);
}

function activeReservationSql(alias = "") {
  const prefix = alias ? `${alias}.` : "";
  return `(${prefix}status = 'Approved' OR (${prefix}status = 'Pending' AND (${prefix}expires_at IS NULL OR ${prefix}expires_at > NOW())))`;
}

async function expirePendingReservations(db) {
  const [result] = await db.promise().query(
    `UPDATE reservations
        SET status = 'Cancelled', expires_at = NULL
      WHERE status = 'Pending'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()`
  );

  if (result.affectedRows) {
    console.log(`Expired ${result.affectedRows} abandoned pending reservation(s).`);
  }
}

function startPendingExpirationJob(db) {
  const run = () => {
    expirePendingReservations(db).catch((error) => {
      console.error("Could not expire pending reservations:", error);
    });
  };

  run();
  const timer = setInterval(run, EXPIRY_CHECK_INTERVAL_MS);
  timer.unref();
}

module.exports = {
  activeReservationSql,
  createPendingExpiry,
  expirePendingReservations,
  getPendingReservationHours,
  startPendingExpirationJob,
};
