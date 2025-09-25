//src/routes/AdminRoutes
import {Router } from "express"
import { SignUpController} from "../controllers/AuthController"


const router = Router();

router.post("/signUp", SignUpController);

export default router;