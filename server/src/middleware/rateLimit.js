// Small in-memory rate limiter (no extra dependency). Counts are kept per
// process, so use a shared store such as Redis if you run several instances.
export function rateLimit({
  windowMs,
  max,
  message = "Too many requests. Please try again later.",
}) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);

  cleanup.unref();

  return (req, res, next) => {
    if (process.env.NODE_ENV === "test") return next();

    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1000))
      );

      return res.status(429).json({ success: false, message });
    }

    return next();
  };
}
