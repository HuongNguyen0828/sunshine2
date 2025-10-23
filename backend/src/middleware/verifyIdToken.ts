// backend/src/middleware/verifyIdToken.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../lib/firebase";

export const verifyIdToken = async (req: Request, res: Response, next: NextFunction) => {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ ok: false, message: "Missing Authorization header" });

  try {
    const decoded = await admin.auth().verifyIdToken(m[1], true);
    (req as any).auth = decoded;
    next();
  } catch {
    res.status(401).json({ ok: false, message: "Invalid token" });
  }
};
