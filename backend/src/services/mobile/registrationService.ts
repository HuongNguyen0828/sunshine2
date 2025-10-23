// backend/src/services/mobile/registrationService.ts
import { admin, db } from "../../lib/firebase";

type PrecheckResult =
  | { allowed: false; reason?: string }
  | { allowed: true; role: "teacher" | "parent"; locationId: string; userDocId: string };

type CompletePayload = {
  emailLower: string;
  authUid: string;
  provider: "password" | "emailLink";
};

type CompleteResult =
  | { ok: false; reason?: string }
  | { ok: true; claims: { role: string; locationId: string; userDocId: string } };

const norm = (v: string) => (v ?? "").trim().toLowerCase();
const isTeacherOrParent = (r: unknown) => {
  const v = String(r ?? "").toLowerCase();
  return v === "teacher" || v === "parent";
};
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const DEBUG = String(process.env.DEBUG_MOBILE ?? "").toLowerCase() === "1";

// Helpers to keep literal types (`allowed: true/false`, `ok: true/false`)
const preFail = (reason?: string): PrecheckResult =>
  DEBUG && reason ? ({ allowed: false, reason } as const) : ({ allowed: false } as const);

const preOk = (
  role: "teacher" | "parent",
  locationId: string,
  userDocId: string
): PrecheckResult => ({ allowed: true, role, locationId, userDocId } as const);

const completeFail = (reason?: string): CompleteResult =>
  DEBUG && reason ? ({ ok: false, reason } as const) : ({ ok: false } as const);

const completeOk = (claims: {
  role: string;
  locationId: string;
  userDocId: string;
}): CompleteResult => ({ ok: true, claims } as const);

// Look up user by either `email` or `emailLower` (legacy-safe)
async function findUserByAnyEmailField(emailLower: string) {
  let snap = await db
    .collection("users")
    .where("email", "==", emailLower)
    .limit(1)
    .get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, data: doc.data() as Record<string, any>, ref: doc.ref };
  }

  snap = await db
    .collection("users")
    .where("emailLower", "==", emailLower)
    .limit(1)
    .get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, data: doc.data() as Record<string, any>, ref: doc.ref };
  }

  return null;
}

/**
 * Precheck before allowing registration.
 * Rules:
 *  - email must exist in `users` (match `email` or `emailLower`)
 *  - role must be teacher or parent
 *  - isRegistered must be false (or undefined)
 *  - locationId must exist
 *  - status is intentionally ignored
 */
export async function precheckRegistrationService(
  emailInput: string
): Promise<PrecheckResult> {
  const emailLower = norm(emailInput);
  if (!emailLower || !isEmail(emailLower)) return preFail("invalid_email");

  const found = await findUserByAnyEmailField(emailLower);
  if (!found) return preFail("user_not_found");

  const u = found.data;
  const roleOk = isTeacherOrParent(u?.role);
  const notYet = u?.isRegistered === false || u?.isRegistered === undefined;
  const locationId = String(u?.locationId ?? "");

  if (!roleOk) return preFail("role_not_allowed");
  if (!notYet) return preFail("already_registered");
  if (!locationId) return preFail("missing_locationId");

  const role = String(u.role).toLowerCase() as "teacher" | "parent";
  return preOk(role, locationId, found.id);
}

/**
 * Complete registration after Firebase Auth account is created.
 * Side effects:
 *  - set custom claims (role, locationId, userDocId)
 *  - update user doc: isRegistered=true, authUid, timestamps, provider
 * Notes:
 *  - status is intentionally ignored
 */
export async function completeRegistrationService(
  payload: CompletePayload
): Promise<CompleteResult> {
  const emailLower = norm(payload.emailLower);
  if (!emailLower || !isEmail(emailLower)) return completeFail("invalid_email");
  if (!payload.authUid) return completeFail("missing_uid");

  const found = await findUserByAnyEmailField(emailLower);
  if (!found) return completeFail("user_not_found");

  try {
    const out = await db.runTransaction<CompleteResult>(async (t) => {
      const snap = await t.get(found.ref);
      if (!snap.exists) return completeFail("doc_missing");

      const u = snap.data() as Record<string, any>;
      const roleOk = isTeacherOrParent(u?.role);
      const notYet = u?.isRegistered === false || u?.isRegistered === undefined;
      const locationId = String(u?.locationId ?? "");

      if (!roleOk) return completeFail("role_not_allowed");
      if (!notYet) return completeFail("already_registered");
      if (!locationId) return completeFail("missing_locationId");

      const role = String(u.role).toLowerCase();
      const claims = { role, locationId, userDocId: found.id };

      // Set custom claims on the Auth user
      await admin.auth().setCustomUserClaims(payload.authUid, claims);

      // Mark the Firestore user as registered
      t.update(found.ref, {
        authUid: payload.authUid,
        isRegistered: true,
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        registeredProvider: payload.provider,
      });

      return completeOk(claims);
    });

    return out;
  } catch (e) {
    if (DEBUG) console.error("[completeRegistrationService] error", e);
    return completeFail("tx_error");
  }
}
