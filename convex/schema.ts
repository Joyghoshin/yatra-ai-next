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

  llmUsage: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_feature", ["feature"])
    .index("by_createdAt", ["createdAt"]),

  // DUMMY flight reservations — simulated PNRs for the Search Flight feature.
  // These are NOT real Duffel orders: no payment or passenger details are
  // collected, and no ticket is issued. userId/tripId are optional so a
  // booking can be linked back to the trip it was made from, but the
  // reservation still works even if that context isn't passed in.
  reservations: defineTable({
    userId: v.optional(v.id("users")),
    tripId: v.optional(v.id("trips")),
    pnr: v.string(),
    offerId: v.string(),
    carrier: v.string(),
    origin: v.string(),
    destination: v.string(),
    price: v.string(),
    currency: v.string(),
    status: v.string(), // "DUMMY_CONFIRMED"
    createdAt: v.number(),
  })
    .index("by_pnr", ["pnr"])
    .index("by_user", ["userId"])
    .index("by_trip", ["tripId"]),
});