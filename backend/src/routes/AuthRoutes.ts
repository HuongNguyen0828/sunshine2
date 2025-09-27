//src/routes/AdminRoutes
import {Router } from "express"
import {checkEmail, verifyRole, getAdmin } from "../controllers/AuthController"


const router = Router();

router.post("/check-email", checkEmail );
router.post("/verify-role", verifyRole);
router.get("/get-admin", getAdmin);

export default router;