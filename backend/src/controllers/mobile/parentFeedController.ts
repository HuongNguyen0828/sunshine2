// backend/src/controllers/mobile/parentFeedController.ts
import { Request, Response } from "express";
import { parentFeedService } from "../../services/mobile/parentFeedService";
import { AuthRequest } from "../../middleware/authMiddleware";

export const getParentFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userDocId = req.user?.userDocId;

    if (!userDocId) {
      return res.status(400).json({ message: "Missing userDocId in token" });
    }

    const result = await parentFeedService(userDocId);

    return res.status(200).json({
      ok: true,
      count: result.length,
      entries: result,
    });
  } catch (err: any) {
    console.error("Error fetching parent feed:", err);
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch parent feed",
      error: err?.message || String(err),
    });
  }
};
