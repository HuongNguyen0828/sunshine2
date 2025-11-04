// backend/controllers/web-admin/ChildController.ts
import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import * as Svc from "../../services/web-admin/childService";
import { EnrollmentStatus } from "../../../../shared/types/type";

/* ---------------- helpers ---------------- */

// Trim string to undefined
function s(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// Parse enrollmentStatus safely (accepts case-insensitive)
function parseStatus(v: unknown): EnrollmentStatus | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().toLowerCase();
  if (t === "new") return EnrollmentStatus.New;
  if (t === "waitlist") return EnrollmentStatus.Waitlist;
  if (t === "active") return EnrollmentStatus.Active;
  if (t === "withdraw") return EnrollmentStatus.Withdraw;
  return undefined;
}

// Send success
function ok(res: Response, payload: unknown, code = 200) {
  return res.status(code).json(payload);
}

// Send error
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

/* ---------------- controllers ---------------- */

// // GET /admin/children
// export async function getChildren(req: AuthRequest, res: Response) {
//   try {
//     const filters = {
//       classId: s(req.query.classId),
//       status: s(req.query.status) as EnrollmentStatus | undefined,
//       parentId: s(req.query.parentUserId),
//     };
//     const items = await Svc.listChildren(req.user?.uid, filters);
//     return ok(res, items);
//   } catch (e) {
//     console.error("[getChildren]", e);
//     return fail(res, e, "Failed to load children");
//   }
// }

export async function getChildren(req: AuthRequest, res: Response) {
  // Extract locationId and daycareId from req.user (set by authMiddleware)
    const locationId = req.user?.locationId;
    const daycareId = req.user?.daycareId;
    if (!daycareId) {
      return res.status(400).json({message: "Daycare missing from user profile"});
    }
    if (!locationId) {
      return res.status(400).json({message: "Location missing from user profile"});
    }
  
    // Else, get all children only of that daycare and location
    try {
      const children = await Svc.getAllChildren(daycareId, locationId);
      return res.status(200).json(children);
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Failed to fetch Children" });
    }
}


// POST /admin/children
export async function addChild(req: AuthRequest, res: Response) {
  // Extract loationId and the parent data from req.user and req.body
    const locationId = req.user?.locationId;
    const daycareId = req.user?.daycareId;
  
    if (!daycareId) {
      return res.status(400).json({message: "Daycare missing from current Admin  profile"});
    }
  
    // Check locationId exists
    if (!locationId) {
      return res.status(400).json({message: "Location missing from current Admin  profile"});
    }

    // Check body exists and extract data
    const body = req.body;
    if (!body) {
      return res.status(400).json({ message: "Request body required" });
    }

    // Extract child, parent1 and parent2 from req.body
    const childData = body.child;
    const parent1Data = body.parent1;
    const parent2Data = body.parent2;
  
    // Else, create the teacher
    try {
      const created = await Svc.addChildWithParents(childData, parent1Data, parent2Data );

      return res.status(201).json(created);
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Error creating Parent" });
    }
  };
  

// PUT /admin/children/:id
export async function updateChild(req: AuthRequest, res: Response) {
  // Extract locationId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin profile"});
  }
  
  const daycareId = req.user?.daycareId;

  if (!daycareId) {
    return res.status(400).json({message: "Daycare missing from current Admin  profile"});
  }

  try {
    const id = s((req.params as { id?: string }).id);
    if (!id) return res.status(400).json({ message: "Missing child id" });

    const enrollmentStatus = parseStatus((req.body ?? {}).enrollmentStatus);
    const patch = { ...(req.body ?? {}), enrollmentStatus };

    // Need check Admin permission before proceeding

    const updated = await Svc.updateChildById(id, patch);
    return ok(res, updated);
  } catch (e) {
    console.error("[updateChild]", e);
    return fail(res, e, "Failed to update child");
  }
}

// DELETE /admin/children/:id
export async function deleteChild(req: AuthRequest, res: Response) {
  // Extract locationId from req.user (set by authMiddleware)
  const locationId = req.user?.locationId;
  if (!locationId) {
    return res.status(400).json({message: "Location missing from current Admin profile"});
  }
  
  const daycareId = req.user?.daycareId;

  if (!daycareId) {
    return res.status(400).json({message: "Daycare missing from current Admin  profile"});
  }

  // Checking permission before proceeding 
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

// POST /admin/children/:id/link-parent-by-email
export async function linkParentByEmail(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    const emailRaw = s(req.body?.email);
    if (!id || !emailRaw) {
      return res.status(400).json({ message: "Missing child id or email" });
    }
    const email = emailRaw.toLowerCase();

    await Svc.linkParentToChildByEmail(id, email, req.user?.uid);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[linkParentByEmail]", e);
    return fail(res, e, "Failed to link parent by email");
  }
}

// POST /admin/children/:id/unlink-parent
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

// POST /admin/children/:id/assign
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

// POST /admin/children/:id/unassign
export async function withdrawChildChild(req: AuthRequest, res: Response) {
  try {
    const id = s((req.params as { id?: string }).id);
    if (!id) return res.status(400).json({ message: "Missing child id" });

    await Svc.withdrawChild(id, req.body);
    return ok(res, { ok: true });
  } catch (e) {
    console.error("[unassignChild]", e);
    return fail(res, e, "Failed to unassign child");
  }
}
