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

    const items = snap.docs.map(d => {
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

    return res.json(items);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch locations" });
  }
}
