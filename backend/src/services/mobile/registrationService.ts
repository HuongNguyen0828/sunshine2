// backend/src/services/mobile/registrationService.ts
import { admin, db } from "../../lib/firebase";

type PrecheckResult =
  | { allowed: false }
  | { allowed: true; role: "teacher" | "parent" | "admin"; locationId: string; userDocId: string };

type CompletePayload = {
  emailLower: string;
  authUid: string;
  provider: "password" | "emailLink";
};

type CompleteResult =
  | { ok: false }
  | { ok: true; claims: { role: string; locationId: string; userDocId: string } };

function normalizeEmail(v: string) {
  return (v ?? "").trim().toLowerCase();
}

function okEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function findUserByEmailLower(emailLower: string) {
  const snap = await db.collection("users").where("email", "==", emailLower).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as Record<string, any>, ref: doc.ref };
}

export async function precheckRegistrationService(emailInput: string): Promise<PrecheckResult> {
  const emailLower = normalizeEmail(emailInput);
  if (!emailLower || !okEmail(emailLower)) return { allowed: false };

  const found = await findUserByEmailLower(emailLower);
  if (!found) return { allowed: false };

  const u = found.data;
  const allowed = u?.status === "Active" && u?.isRegistered === false;
  if (!allowed) return { allowed: false };

  const role = String(u?.role ?? "");
  const locationId = String(u?.locationId ?? "");
  if (!role || !locationId) return { allowed: false };

  return { allowed: true, role: role as any, locationId, userDocId: found.id };
}

export async function completeRegistrationService(payload: CompletePayload): Promise<CompleteResult> {
  const emailLower = normalizeEmail(payload.emailLower);
  if (!emailLower || !okEmail(emailLower)) return { ok: false };
  if (!payload.authUid) return { ok: false };

  const found = await findUserByEmailLower(emailLower);
  if (!found) return { ok: false };

  try {
    const out = await db.runTransaction(async (t) => {
      const snap = await t.get(found.ref);
      if (!snap.exists) return { ok: false } as const;

      const u = snap.data() as Record<string, any>;
      if (u?.status !== "Active" || u?.isRegistered !== false) return { ok: false } as const;

      const role = String(u?.role ?? "");
      const locationId = String(u?.locationId ?? "");
      if (!role || !locationId) return { ok: false } as const;

      const claims = { role, locationId, userDocId: found.id };
      await admin.auth().setCustomUserClaims(payload.authUid, claims);

      t.update(found.ref, {
        authUid: payload.authUid,
        isRegistered: true,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        registeredProvider: payload.provider,
      });

      return { ok: true, claims } as const;
    });

    return out;
  } catch {
    return { ok: false };
  }
}
