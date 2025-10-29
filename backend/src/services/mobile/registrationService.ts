// backend/src/services/mobile/registrationService.ts
import { admin, db } from "../../lib/firebase";

/* =========
   Types
   ========= */

type PrecheckResult =
  | { allowed: false; reason?: string }
  | {
      allowed: true;
      role: "teacher" | "parent";
      userDocId: string;
      locationId?: string;
      hasLocation: boolean;
      needsLocation: boolean;
    };

type CompletePayload = {
  emailLower: string;
  authUid: string;
  provider: "password" | "emailLink";
};

type CompleteResult =
  | { ok: false; reason?: string }
  | {
      ok: true;
      claims: { role: string; userDocId: string; locationId?: string };
      hasLocation: boolean;
      needsLocation: boolean;
    };

/* =========
   Utils
   ========= */

const norm = (v: string) => (v ?? "").trim().toLowerCase();
const isTeacherOrParent = (r: unknown) => {
  const v = String(r ?? "").toLowerCase();
  return v === "teacher" || v === "parent";
};
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const DEBUG = String(process.env.DEBUG_MOBILE ?? "").toLowerCase() === "1";

/* Keep literal types (`allowed: true/false`, `ok: true/false`) */
const preFail = (reason?: string): PrecheckResult =>
  DEBUG && reason ? ({ allowed: false, reason } as const) : ({ allowed: false } as const);

const preOk = (payload: Extract<PrecheckResult, { allowed: true }>): PrecheckResult =>
  ({ ...payload } as const);

const completeFail = (reason?: string): CompleteResult =>
  DEBUG && reason ? ({ ok: false, reason } as const) : ({ ok: false } as const);

const completeOk = (payload: Extract<CompleteResult, { ok: true }>): CompleteResult =>
  ({ ...payload } as const);

/* Look up user by either `email` or `emailLower` (legacy-safe) */
async function findUserByAnyEmailField(emailLower: string) {
  let snap = await db.collection("users").where("email", "==", emailLower).limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, data: doc.data() as Record<string, any>, ref: doc.ref };
  }

  snap = await db.collection("users").where("emailLower", "==", emailLower).limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    return { id: doc.id, data: doc.data() as Record<string, any>, ref: doc.ref };
  }

  return null;
}

/* ============================================
   Precheck before allowing registration.
   Rules:
   - email must exist in `users` (match `email` or `emailLower`)
   - role must be teacher or parent
   - isRegistered must be false (or undefined)
   - locationId is OPTIONAL (we return needsLocation=true when missing)
   - status is intentionally ignored
   ============================================ */
export async function precheckRegistrationService(emailInput: string): Promise<PrecheckResult> {
  const emailLower = norm(emailInput);
  if (!emailLower || !isEmail(emailLower)) return preFail("invalid_email");

  const found = await findUserByAnyEmailField(emailLower);
  if (!found) return preFail("user_not_found");

  const u = found.data;
  const roleOk = isTeacherOrParent(u?.role);
  const notYet = u?.isRegistered === false || u?.isRegistered === undefined;

  if (!roleOk) return preFail("role_not_allowed");
  if (!notYet) return preFail("already_registered");

  const role = String(u.role).toLowerCase() as "teacher" | "parent";
  const rawLocationId = String(u?.locationId ?? "");
  const hasLocation = !!rawLocationId;

  return preOk({
    allowed: true,
    role,
    userDocId: found.id,
    locationId: hasLocation ? rawLocationId : undefined,
    hasLocation,
    needsLocation: !hasLocation,
  });
}

/* ==========================================================
   Complete registration after Firebase Auth account is created.
   Side effects:
   - set custom claims (role, userDocId, + locationId only if present)
   - update user doc: isRegistered=true, authUid, timestamps, provider
   Notes:
   - status is intentionally ignored
   - profile creation for location-less users is deferred to onboarding
   ========================================================== */
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

      if (!roleOk) return completeFail("role_not_allowed");
      if (!notYet) return completeFail("already_registered");

      const role = String(u.role).toLowerCase();
      const rawLocationId = String(u?.locationId ?? "");
      const hasLocation = !!rawLocationId;

      const claims: { role: string; userDocId: string; locationId?: string } = {
        role,
        userDocId: found.id,
      };
      if (hasLocation) claims.locationId = rawLocationId;

      await admin.auth().setCustomUserClaims(payload.authUid, claims);

      t.update(found.ref, {
        authUid: payload.authUid,
        isRegistered: true,
        hasProfile: hasLocation, // helpful for onboarding branch
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        registeredProvider: payload.provider,
      });

      return completeOk({
        ok: true,
        claims,
        hasLocation,
        needsLocation: !hasLocation,
      });
    });

    return out;
  } catch (e) {
    if (DEBUG) console.error("[completeRegistrationService] error", e);
    return completeFail("tx_error");
  }
}
