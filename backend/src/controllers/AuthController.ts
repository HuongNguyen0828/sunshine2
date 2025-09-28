import admin from "firebase-admin";
import { Response, Request } from "express";
import {
  findRoleByEmail,
  createUser,
  getUserByUid,
} from "../services/authService";
import { UserRole } from "../models/user";

// Check email before let user Signin
export async function checkEmail(req: Request, res: Response) {
  try {
    // email input
    const { email } = req.body;
    // calling serive
    const role = await findRoleByEmail(email);
    // If not email
    if (!role)
      return res
        .status(403)
        .send({
          message:
            "Email not authorized. You need register your daycare with Sunshine",
        });

    res.send({ role });
  } catch (err: any) {
    res.status(500).send({ message: err.message });
  }
}

// Create user by Verify userRole: link the user uid of
export async function verifyRole(req: Request, res: Response) {
  try {
    const { idToken, name } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    // return email or null
    const email = decoded.email ?? null;
    // Extract role from email
    const role = await findRoleByEmail(email);

    // If role = null
    if (!role) return res.status(403).send({ message: "Unauthorized email!" });
    // if role is defined, create users collection in Firestore with same uid with uid in Firebase Auth
    await createUser(decoded.uid, email, role, name);
    res.send({ message: "User verified", role });
  } catch (err: any) {
    res.status(500).send({ message: err.message });
  }
}

// Give Request with existing attribute user
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      uid: string;
      email: string;
      role: UserRole;
    };
  }
}

// Only admin can get in web-admin
export async function getAdmin(req: Request, res: Response) {
  try {
    // if no user return from middleware
    if (!req.user)
      return res.status(403).send({ message: "No user logged in." });
    // Case user is not Admin
    if (req.user.role !== UserRole.Admin)
      return res
        .status(403)
        .send({
          message: `Access denied. Admins only. As ${req.user.role}, please use Sunshine mobile app`,
        });
    // else, Case admin return user is Admin\
    res.status(200).send({ user: req.user });
  } catch (err: any) {
    res.status(500).send({ message: err.message });
  }
}

// Only Teacher or Parent can get in Mobile
export async function getParentOrTeacher(req: Request, res: Response) {
  try {
    // if no user return from middleware
    if (!req.user)
      return res.status(403).send({ message: "No user logged in." });
    // Case user is not Parent or not Teacher, but Admin
    if (req.user.role === UserRole.Admin )
      return res
        .status(403)
        .send({
          message: `Access denied. As ${req.user.role}, please login via web app`,
        });
    // else, Case Teacher or Parent return user is Admin\
    res.status(200).send({ user: req.user });
  } catch (err: any) {
    res.status(500).send({ message: err.message });
  }
}