// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../lib/firebase";
import { findRoleByEmail } from "../services/authService";
import { UserRole } from "../models/user";

// Use a different property name to avoid clashing with Request['user'] from other libs
export interface AuthRequest extends Request {
  auth?: {
    uid: string;
    email: string | null;
    role: UserRole;
  };
}

/**
 * Auth middleware:
 * - Verifies Firebase ID token from Authorization header (Bearer <token>)
 * - Resolves user role by email across collections
 * - Attaches { uid, email, role } to req.auth
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Missing or invalid Authorization header" });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    if (!idToken) {
      return res
        .status(401)
        .json({ message: "Missing ID token in Authorization header" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email ?? null;

    const role = await findRoleByEmail(email);
    if (!role) {
      return res.status(403).json({ message: "Unauthorized email" });
    }

    req.auth = { uid: decoded.uid, email, role };
    return next();
  } catch (err) {
    console.error("[authMiddleware] verifyIdToken error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
