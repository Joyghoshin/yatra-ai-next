import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createTrip = mutation({
  args: {
    token: v.string(),
    destination: v.string(),
    origin: v.optional(v.string()),
    mode: v.union(v.literal("india"), v.literal("international")),
    days: v.number(),
    budget: v.string(),
    preferences: v.array(v.string()),
    itinerary: v.any(),
  },
  handler: async (ctx, { token, destination, origin, mode, days, budget, preferences, itinerary }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Not authenticated. Please log in again.");
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() + days);
    const endDate = endDateObj.toISOString().slice(0, 10);

    const now = Date.now();
    const tripId = await ctx.db.insert("trips", {
      userId: session.userId,
      destination,
      origin,
      mode,
      startDate,
      endDate,
      budget,
      preferences,
      itinerary,
      status: "planning",
      createdAt: now,
      updatedAt: now,
    });

    return { tripId };
  },
});

export const getTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    return await ctx.db.get(tripId);
  },
});

export const listTrips = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Not authenticated.");
    }

    return await ctx.db
      .query("trips")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .collect();
  },
});

export const generateShareLink = mutation({
  args: { token: v.string(), tripId: v.id("trips") },
  handler: async (ctx, { token, tripId }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Not authenticated.");
    }

    const trip = await ctx.db.get(tripId);
    if (!trip) throw new Error("Trip not found.");
    if (trip.userId !== session.userId) throw new Error("You don't own this trip.");

    if (trip.shareId) return { shareId: trip.shareId };

    const shareId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await ctx.db.patch(tripId, { shareId });
    return { shareId };
  },
});

export const getTripByShareId = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .unique();
    if (!trip) return null;

    // Strip userId before returning publicly — no reason a visitor needs to see it
    const { userId, ...publicTrip } = trip;
    return publicTrip;
  },
});