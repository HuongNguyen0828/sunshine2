import {Router} from 'express';
import  {getSchedulesForTeacher, getSchedulesForParent} from '../../controllers/mobile/scheduleControllers';
import { authMiddleware } from "../../middleware/authMiddleware";


const router = Router();
// For teacher route
router.get('/schedules', authMiddleware, getSchedulesForTeacher);
// For parent route
router.get('/schedulesParent', authMiddleware, getSchedulesForParent);

export default router;