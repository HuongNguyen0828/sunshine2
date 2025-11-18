import {Router} from 'express';
import  {getSchedulesForTeacher} from '../../controllers/mobile/scheduleControllers';
import { authMiddleware } from "../../middleware/authMiddleware";


const router = Router();
router.get('/schedules', authMiddleware, getSchedulesForTeacher);

export default router;