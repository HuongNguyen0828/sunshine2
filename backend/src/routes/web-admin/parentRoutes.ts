// Express router for Parent endpoints.
// This router should be mounted in server.ts like:
//   app.use("/api/parents", ParentRoutes);

import { Router } from "express";
import {
  getAllParents,
  // addParent,
  getParentById,
  updateParent,
  deleteParent,
  assignParentToChild,
} from "../../controllers/web-admin/ParentController"
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

// Global auth guard for this router
router.use(authMiddleware);

// Create
// router.post("/", authMiddleware, addParent);

// Read (list)
router.get("/", authMiddleware, getAllParents);

// Read (detail)
router.get("/:id", authMiddleware, getParentById);

// Update
router.put("/:id", authMiddleware, updateParent);

// Delete
router.delete("/:id", authMiddleware, deleteParent);

// Assign class
router.post("/:id/assign", authMiddleware, assignParentToChild);

export default router;
