//src/routes/AdminRoutes
import {Router } from "express"
import {checkEmail, verifyRole, getAdmin } from "../controllers/AuthController"
import { adminAuthMiddleware } from "../middleware/authMiddleware";


const router = Router();

// In Express, req.user only exists if having a middleware that:
    // Verifies the ID token (from Firebase Auth)
    // Attaches the user info (like UID, email, role) to req.user

router.post("/check-email", checkEmail );
router.post("/verify-role", verifyRole);

// Route to get admin info, protected by middleware
    // 1. adminAuthMiddleware verifies the Firebase ID token and attaches req.user
    // 2. getAdmin checks req.user.role and allows access only if the role is "admin"
router.get("/get-admin", adminAuthMiddleware, getAdmin); 

export default router;