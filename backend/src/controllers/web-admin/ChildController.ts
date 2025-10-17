// backend/controllers/web-admin/ChildController.ts
import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as Svc from "../../services/web-admin/childService";
import type { EnrollmentStatus } from "../../../../shared/types/type";

/** normalize a string */
function s(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/** send JSON success */
function ok(res: Response, payload: unknown, code = 200) {
  return res.status(code).json(payload);
}

/** send JSON error with consistent shape */
function fail(res: Response, err: unknown, fallbackMsg: string, fallbackCode = 500) {
  const status =
    typeof (err as { status?: number })?.status === "number"
      ? (err as { status: number }).status
      : fallbackCode;

  const message =
    typeof (err as { message?: string })?.message === "string"
      ? (err as { message: string }).message
      : fallbackMsg;

  return res.status(status).json({ message });
}

/** GET /admin/children */
export async function getChildren(req: AuthRequest, res: Response) {
  try {
    const filters = {
      classId: s(req.query.classId),
      status: s(req.query.status) as EnrollmentStatus | undefined,
      parentId: s(req.query.parentUserId),
    };
    const items = await Svc.listChildren(req.user?.uid, filters);
    return ok(res, items);
  } catch (e) {
    console.error("[getChildren]", e);
    return fail(res, e, "Failed to load children");
  }
}

/** POST /admin/children — daycareId is injected by the service */
export async function addChild(req: AuthRequest, res: Response) {
  try {
    const created = await Svc.createChild(req.body, req.user?.uid);
    return ok(res, created, 201);
  } catch (e) {
    console.error("[addChild]", e);
    return fail(res, e, "Failed to add child");
  }
}

/** PUT /admin/children/:id — profile update only */
export async function updateChild(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    if (!id) return res.status(400).json({ message: "Missing child id" });

    const updated = await Svc.updateChildById(id, req.body, req.user?.uid);
    return ok(res, updated);
  } catch (e) {
    console.error("[updateChild]", e);
    return fail(res, e, "Failed to update child");
  }
}

/** DELETE /admin/children/:id */
export async function deleteChild(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    if (!id) return res.status(400).json({ message: "Missing child id" });

    await Svc.deleteChildById(id, req.user?.uid);
    return res.status(204).send();
  } catch (e) {
    console.error("[deleteChild]", e);
    return fail(res, e, "Failed to delete child");
  }
}

/** POST /admin/children/:id/link-parent-by-email */
export async function linkParentByEmail(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    const email = s(req.body?.email);
    if (!id || !email) {
      return res.status(400).json({ message: "Missing child id or email" });
    }

    await Svc.linkParentToChildByEmail(id, email, req.user?.uid);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[linkParentByEmail]", e);
    return fail(res, e, "Failed to link parent by email");
  }
}

/** POST /admin/children/:id/unlink-parent */
export async function unlinkParent(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    const parentUserId = s(req.body?.parentUserId);
    if (!id || !parentUserId) {
      return res.status(400).json({ message: "Missing child id or parentUserId" });
    }

    await Svc.unlinkParentFromChild(id, parentUserId, req.user?.uid);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[unlinkParent]", e);
    return fail(res, e, "Failed to unlink parent");
  }
}

/** POST /admin/children/:id/assign — assign to class */
export async function assignChild(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    const classId = s(req.body?.classId);
    if (!id || !classId) {
      return res.status(400).json({ message: "Missing child id or classId" });
    }

    await Svc.assignChildToClass(id, classId, req.user?.uid);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[assignChild]", e);
    return fail(res, e, "Failed to assign child");
  }
}

/** POST /admin/children/:id/unassign — unassign from class */
export async function unassignChild(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    if (!id) return res.status(400).json({ message: "Missing child id" });

    await Svc.unassignChild(id, req.user?.uid);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[unassignChild]", e);
    return fail(res, e, "Failed to unassign child");
  }
}
