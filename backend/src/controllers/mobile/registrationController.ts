// backend/src/controllers/mobile/registrationController.ts
import { Request, Response } from "express";
import {
  precheckRegistrationService,
  completeRegistrationService,
} from "../../services/mobile";

function normalizeEmail(v: string) {
  return (v ?? "").trim().toLowerCase();
}

function okEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function precheckRegistration(req: Request, res: Response) {
  try {
    const emailLower = normalizeEmail(String(req.body?.emailLower ?? ""));
    if (!emailLower || !okEmail(emailLower)) {
      return res.json({ allowed: false });
    }

    const out = await precheckRegistrationService(emailLower);
    return res.json(out);
  } catch {
    return res.json({ allowed: false });
  }
}

export async function completeRegistration(req: Request, res: Response) {
  try {
    const emailLower = normalizeEmail(String(req.body?.emailLower ?? ""));
    const authUid = String(req.body?.authUid ?? "");
    const providerRaw = String(req.body?.provider ?? "password");
    const provider = providerRaw === "emailLink" ? "emailLink" : "password";

    if (!emailLower || !okEmail(emailLower) || !authUid) {
      return res.json({ ok: false });
    }

    const auth = (req as any).auth;
    if (!auth || auth.uid !== authUid) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED" });
    }

    const out = await completeRegistrationService({
      emailLower,
      authUid,
      provider,
    });

    return res.json(out);
  } catch {
    return res.json({ ok: false });
  }
}
