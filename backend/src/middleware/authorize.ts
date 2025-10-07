// backend/src/middleware/authorize.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";
import { UserRole } from "../models/user";

// Role guard that accepts both string and enum values
export function authorize(...roles: (string | UserRole)[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ message: "Unauthorized" });
    if (!req.auth.role) return res.status(403).json({ message: "Forbidden: no role assigned" });

    const allowed = roles.map((r) => String(r).toLowerCase());
    const current = String(req.auth.role).toLowerCase();

    if (!allowed.includes(current)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
}
