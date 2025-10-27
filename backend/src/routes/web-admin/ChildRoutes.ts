// backend/routes/web-admin/ChildRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as C from "../../controllers/web-admin/ChildController";

const r = Router();

// All routes below require authentication
r.use(authMiddleware);

/** ---------- Child management ---------- **/

// List all children (with optional filters)
r.get("/", C.getChildren);

// Create new child (daycareId is injected automatically)
r.post("/", C.addChild);

// Update child profile (not enrollment)
r.put("/:id", C.updateChild);

// Delete a child
r.delete("/:id", C.deleteChild);

/** ---------- Parent linking ---------- **/

// Link parent by email (finds parent user automatically)
r.post("/:id/link-parent-by-email", C.linkParentByEmail);

// Unlink a parent by userId
r.post("/:id/unlink-parent", C.unlinkParent);

/** ---------- Class assignment ---------- **/

// Assign a child to class (with age & capacity validation)
r.post("/:id/assign", C.assignChild);

// Unassign a child from class
r.post("/:id/unassign", C.withdrawChildChild);

export default r;
