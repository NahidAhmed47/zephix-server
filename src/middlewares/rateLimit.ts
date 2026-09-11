import rateLimit from "express-rate-limit";

const message = {
  statusCode: 429,
  success: false,
  message: "Too many requests. Please try again shortly.",
};

/** Tight limiter for auth endpoints (login/refresh/change-password). */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

/** Limiter for sensitive endpoints (sending SMS/email, cron triggers). */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
