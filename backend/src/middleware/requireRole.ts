// backend/src/middleware/requireRole.ts
import { Request, Response, NextFunction } from "express";

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole =
      (req as any).user?.role ??
      (req as any).auth?.role ??
      (req as any).auth?.claims?.role;

    if (!userRole || !roles.includes(String(userRole))) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    next();
  };
};
