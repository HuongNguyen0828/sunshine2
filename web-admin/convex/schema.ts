import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Simple one-way announcements/messages
  announcements: defineTable({
    // Sender info (from Firebase session - no auth required in Convex)
    senderName: v.string(),
    senderEmail: v.string(),
    senderRole: v.union(v.literal("admin"), v.literal("teacher")),

    // Content
    text: v.string(),
    imageUrl: v.optional(v.string()),

    // Targeting (optional - for future filtering)
    targetAudience: v.optional(v.union(
      v.literal("all"),
      v.literal("parents"),
      v.literal("teachers")
    )),
    locationId: v.optional(v.string()),
    classId: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_location", ["locationId", "createdAt"])
    .index("by_class", ["classId", "createdAt"]),
});
