import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List all announcements (newest first)
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("announcements")
      .withIndex("by_created_at")
      .order("desc")
      .take(limit);
  },
});

// List by location
export const listByLocation = query({
  args: {
    locationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("announcements")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .order("desc")
      .take(limit);
  },
});

// List by class
export const listByClass = query({
  args: {
    classId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    return await ctx.db
      .query("announcements")
      .withIndex("by_class", (q) => q.eq("classId", args.classId))
      .order("desc")
      .take(limit);
  },
});

// Send a new announcement
export const send = mutation({
  args: {
    senderName: v.string(),
    senderEmail: v.string(),
    senderRole: v.union(v.literal("admin"), v.literal("teacher")),
    text: v.string(),
    imageUrl: v.optional(v.string()),
    targetAudience: v.optional(v.union(
      v.literal("all"),
      v.literal("parents"),
      v.literal("teachers")
    )),
    locationId: v.optional(v.string()),
    classId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("announcements", {
      senderName: args.senderName,
      senderEmail: args.senderEmail,
      senderRole: args.senderRole,
      text: args.text,
      imageUrl: args.imageUrl,
      targetAudience: args.targetAudience ?? "all",
      locationId: args.locationId,
      classId: args.classId,
      createdAt: Date.now(),
    });
  },
});

// Delete an announcement
export const remove = mutation({
  args: {
    id: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
