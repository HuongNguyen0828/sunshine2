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

    // keep as string for backward compatibility
    daycareId: string;
    locationId: string;

    // new: optional arrays for roles that can have multiple scopes (e.g. admin)
    daycareIds?: string[];
    locationIds?: string[];

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

    // optional guard: prevent accessing other user's data by uid param
    if (req.params.uid && req.params.uid !== decoded.uid) {
      return res
        .status(403)
        .send({ message: "Forbidden: cannot access other user's data" });
    }

    // keep these as strings (backward compatible)
    let daycareId = "";
    let locationId = "";

    // new: arrays for multi-scope support
    let daycareIds: string[] | undefined;
    let locationIds: string[] | undefined;

    if (role === "parent") {
      // parent: no fixed daycare/location scope at middleware level
      daycareId = "";
      locationId = "";
      daycareIds = [];
      locationIds = [];
    } else {
      // teacher / admin / other staff roles:
      // still reuse existing helper; if later admin supports multiple,
      // authService can be extended without breaking this shape.
      const daycareAndLocationResult = await findDaycareAndLocationByEmail(
        email
      );

      if (!daycareAndLocationResult) {
        return res
          .status(403)
          .send({ message: "No daycare or location found for this user" });
      }

      daycareId = daycareAndLocationResult.daycareId;
      locationId = daycareAndLocationResult.locationId;

      daycareIds = daycareId ? [daycareId] : [];
      locationIds = locationId ? [locationId] : [];
    }

    // if you ever encode userDocId into the token, keep reading it
    const userDocId = (decoded as any).userDocId as string | undefined;

    req.user = {
      uid: decoded.uid,
      email,
      role,
      daycareId,
      locationId,
      daycareIds,
      locationIds,
      userDocId,
    };

    return next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(401).send({ message: "Invalid token" });
  }
};
