import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

// Only this email can view the analytics dashboard.
// Replace with your actual login email if different.
const ADMIN_EMAIL = "joyghoshin@gmail.com";

export const logUsage = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    tripId: v.optional(v.id("trips")),
    feature: v.union(v.literal("generateItinerary"), v.literal("chatWithTrip")),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    latencyMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("llmUsage", { ...args, createdAt: Date.now() });
  },
});

export const getUsageStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Not authenticated. Please log in again.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.email !== ADMIN_EMAIL) {
      throw new Error("Not authorized to view this dashboard.");
    }

    // Most recent 500 calls — enough for a demo-scale dashboard without unbounded reads.
    const records = await ctx.db.query("llmUsage").order("desc").take(500);
    return records;
  },
});