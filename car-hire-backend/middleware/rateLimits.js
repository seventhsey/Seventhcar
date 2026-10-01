const { rateLimit } = require("express-rate-limit");

function jsonRateLimit({ windowMs, limit, message, skipSuccessfulRequests = false, skipAdmin = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: skipAdmin ? (req) => Boolean(req.session?.userId) : undefined,
    handler(req, res) {
      res.status(429).json({ success: false, error: message });
    },
  });
}

const loginLimiter = jsonRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
});

const reservationLookupLimiter = jsonRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many reservation lookup attempts. Please wait and try again.",
});

const quoteLimiter = jsonRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  skipAdmin: true,
  message: "Too many price requests. Please wait a few minutes and try again.",
});

const reservationCreateLimiter = jsonRateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  skipAdmin: true,
  message: "Too many reservation requests. Please wait before trying again.",
});

module.exports = {
  loginLimiter,
  quoteLimiter,
  reservationCreateLimiter,
  reservationLookupLimiter,
};
