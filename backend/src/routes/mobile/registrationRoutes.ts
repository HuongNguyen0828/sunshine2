// backend/src/routes/mobile/registrationRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import { precheckRegistration, completeRegistration } from "../../controllers/mobile/registrationController";
import { verifyIdToken } from "../../middleware/verifyIdToken";
import { rateLimit } from "../../middleware/rateLimit";

const r = Router();

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// Inline validator: precheck
function precheckValidator(req: Request, res: Response, next: NextFunction) {
  const emailLower = normalizeEmail((req.body as any)?.emailLower);
  if (!emailLower || !isEmail(emailLower)) {
    return res.status(400).json({ ok: false, message: "Invalid emailLower" });
  }
  (req.body as any).emailLower = emailLower;
  next();
}

// Inline validator: complete
function completeValidator(req: Request, res: Response, next: NextFunction) {
  const body = req.body as any;
  const emailLower = normalizeEmail(body?.emailLower);
  const authUid = String(body?.authUid ?? "");
  const provider = body?.provider === "emailLink" ? "emailLink" : "password";

  if (!emailLower || !isEmail(emailLower)) {
    return res.status(400).json({ ok: false, message: "Invalid emailLower" });
  }
  if (!authUid) {
    return res.status(400).json({ ok: false, message: "authUid required" });
  }

  body.emailLower = emailLower;
  body.authUid = authUid;
  body.provider = provider;
  next();
}

r.post(
  "/v1/registration/precheck",
  rateLimit,
  precheckValidator,
  precheckRegistration
);

r.post(
  "/v1/registration/complete",
  rateLimit,
  verifyIdToken,
  completeValidator,
  completeRegistration
);

export default r;
