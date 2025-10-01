// backend/src/middleware/authorize.ts
import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

/**
 * Role-based guard middleware.
 * Example:
 *   app.use("/api/teachers", authMiddleware, authorize("admin"), teacherRoutes);
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!req.auth.role) {
      return res.status(403).json({ message: "Forbidden: no role assigned" });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    return next();
  };
}
