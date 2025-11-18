// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { admin } from "../lib/firebase";
import {
  findDaycareAndLocationByEmail,
  findRoleByEmail,
} from "../services/authService";
import { UserRole } from "../models/user";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
    daycareId: string;
    locationId: string;
    userDocId?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .send({ message: "Missing or invalid Authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) {
    return res
      .status(401)
      .send({ message: "Missing or invalid idToken in Authorization header" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email ?? null;

    if (!email) {
      return res.status(401).send({ message: "Email missing in token" });
    }

    const role = await findRoleByEmail(email);
    if (!role) {
      return res.status(403).send({ message: "Unauthorized email!" });
    }

    if (req.params.uid && req.params.uid !== decoded.uid) {
      return res
        .status(403)
        .send({ message: "Forbidden: cannot access other user's data" });
    }

    let daycareId = "";
    let locationId = "";

    if (role === "parent") {
      daycareId = "";
      locationId = "";
    } else {
      const daycareAndLocationResult = await findDaycareAndLocationByEmail(
        email
      );
      if (!daycareAndLocationResult) {
        return res
          .status(403)
          .send({ message: "No daycare/location found for this user" });
      }
      daycareId = daycareAndLocationResult.daycareId;
      locationId = daycareAndLocationResult.locationId;
    }

    const userDocId = (decoded as any).userDocId as string | undefined;

    req.user = {
      uid: decoded.uid,
      email,
      role,
      daycareId,
      locationId,
      userDocId,
    };

    next();
  } catch {
    return res.status(401).send({ message: "Invalid token" });
  }
};
