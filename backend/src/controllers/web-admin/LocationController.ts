//backend/src/controllers/web-admin/LocationContorller.ts
import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import { db } from "../../lib/firebase";

const ALLOWED = new Set([
  "name",
  "phone",
  "email",
  "providerId",
  "street",
  "city",
  "province",
  "zip",
  "country",
]);
export async function getLocations(req: AuthRequest, res: Response) {
  try {
    const raw = String(req.query.fields ?? "").trim();
    const fields =
      raw.length > 0
        ? raw.split(",").map(s => s.trim()).filter(s => s && ALLOWED.has(s))
        : null;

    const q = fields && fields.length > 0
      ? db.collectionGroup("locations").select(...fields)
      : db.collectionGroup("locations");

    const snap = await q.get();

    let items = snap.docs.map(d => {
      const data = d.data() as Record<string, unknown>;
      if (fields && fields.length > 0) {
        const picked = fields.reduce<Record<string, unknown>>((o, k) => {
          o[k] = data[k] ?? null;
          return o;
        }, {});
        return { id: d.id, ...picked };
      }
      return { id: d.id, ...data };
    });

    // ✅ server-side scope: return only locations the admin is allowed to see
    // If the admin has exactly one location id, the list will contain only that one.
    const allowed = readAllowedLocationIds(req.user);
    if (allowed) {
      items = items.filter(it => allowed.has(String(it.id)));
    }

    return res.json(items);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch locations" });
  }
}



// --- helpers: read allowed location ids from req.user ---
// Narrow "object-ish" guard
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

// Convert unknown string or string[] to trimmed string[]
function toStrArray(x: unknown): string[] {
  if (typeof x === "string") {
    const t = x.trim();
    return t ? [t] : [];
  }
  if (Array.isArray(x)) {
    const out: string[] = [];
    for (const v of x) if (typeof v === "string" && v.trim()) out.push(v.trim());
    return out;
  }
  return [];
}

// Read all possible locationIds the admin is scoped to
function readAllowedLocationIds(user: unknown): Set<string> | null {
  if (!isRecord(user)) return null;

  const ids = new Set<string>();
  // top-level
  toStrArray(user["locationId"]).forEach(id => ids.add(id));
  toStrArray(user["locationIds"]).forEach(id => ids.add(id));

  // nested profile
  const prof = user["profile"];
  if (isRecord(prof)) {
    toStrArray(prof["locationId"]).forEach(id => ids.add(id));
    toStrArray(prof["locationIds"]).forEach(id => ids.add(id));
  }

  // "*" means no restriction (may select from multiple)
  if (ids.has("*")) return null;

  return ids.size > 0 ? ids : null;
}
