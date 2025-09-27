// authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { findRoleByEmail } from "../services/authService";
import { UserRole } from "../models/user";


// Extend Resquest for including user
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
  };
}

export const adminAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // If no input header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Missing or invalid Authorization header" });
  }
  

  // Else, if have header starting with "Bearer ", extract the token at index [1], 
  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) return res.status(401).send({ message: "Missing or invalid idToken in Authorization header" });


  // Else if idToken is string
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email ?? null;
    const role = await findRoleByEmail(email);

    if (!role) return res.status(403).send({ message: "Unauthorized email!" });

    req.user = { uid: decoded.uid, email: email!, role };
    next();
  } catch (err) {
    return res.status(401).send({ message: "Invalid token" });
  }
};
