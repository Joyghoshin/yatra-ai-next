import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  trips: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    mode: v.union(v.literal("india"), v.literal("international")),
    startDate: v.string(),
    endDate: v.string(),
    budget: v.optional(v.string()),
    preferences: v.optional(v.array(v.string())),
    itinerary: v.optional(v.any()), // day-wise itinerary JSON from Groq
    status: v.union(v.literal("planning"), v.literal("upcoming"), v.literal("completed")),
    shareId: v.optional(v.string()),
    feedback: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    origin: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_shareId", ["shareId"]),
});