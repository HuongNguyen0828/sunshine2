// backend/routes/web-admin/ChildRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import * as C from "../../controllers/web-admin/ChildController";

const r = Router();

// All routes below require authentication
r.use(authMiddleware);

/** ---------- Child management ---------- **/

// List all children (with optional filters)
r.get("/children", C.getChildren);

// Create new child (daycareId is injected automatically)
r.post("/children", C.addChild);

// Update child profile (not enrollment)
r.put("/children/:id", C.updateChild);

// Delete a child
r.delete("/children/:id", C.deleteChild);

/** ---------- Parent linking ---------- **/

// Link parent by email (finds parent user automatically)
r.post("/children/:id/link-parent-by-email", C.linkParentByEmail);

// Unlink a parent by userId
r.post("/children/:id/unlink-parent", C.unlinkParent);

/** ---------- Class assignment ---------- **/

// Assign a child to class (with age & capacity validation)
r.post("/children/:id/assign", C.assignChild);

// Unassign a child from class
r.post("/children/:id/unassign", C.unassignChild);

export default r;
