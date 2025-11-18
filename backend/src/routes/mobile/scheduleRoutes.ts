import {Router} from 'express';
import  {getSchedulesForTeacherController} from '../../controllers/mobile/scheduleControllers';
import { authMiddleware } from "../../middleware/authMiddleware";


const router = Router();
router.get('/schedules', authMiddleware, getSchedulesForTeacherController);

export default router;