// backend/src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

const limiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

function getClientIp(req: Request): string {
  const xff = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return (
    xff ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = getClientIp(req); // always string
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({ ok: false, message: "Too many requests" });
  }
};
