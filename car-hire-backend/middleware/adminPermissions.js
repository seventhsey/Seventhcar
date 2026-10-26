// Session identity and role are loaded from the database by validateSession.
module.exports = function adminPermissions(req, res, next) {
  if (!req.session?.userId || req.adminAccount?.account_role === 'owner') return next();
  const deny = () => res.status(403).json({ error: 'This action is restricted to the owner.' });
  if (!req.adminAccount || req.adminAccount.account_role !== 'admin') return deny();
  if (req.method === 'DELETE') return deny();
  if (/^\/api\/(cars|extras)(\/|$)/i.test(req.path) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return deny();
  if (/^\/api\/reservations(\/|$)/i.test(req.path) && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (['price_override', 'price_override_reason'].some(key => Object.prototype.hasOwnProperty.call(req.body || {}, key))) return deny();
  }
  next();
};
