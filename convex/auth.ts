import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function generateToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

export const signup = mutation({
  args: { email: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, { email, password, name }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) throw new Error("An account with this email already exists.");

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = await ctx.db.insert("users", { email, passwordHash, name, createdAt: Date.now() });

    const token = generateToken();
    await ctx.db.insert("sessions", { userId, token, expiresAt: Date.now() + SESSION_DURATION_MS });

    return { token, user: { id: userId, email, name } };
  },
});

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("Invalid email or password.");

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) throw new Error("Invalid email or password.");

    const token = generateToken();
    await ctx.db.insert("sessions", { userId: user._id, token, expiresAt: Date.now() + SESSION_DURATION_MS });

    return { token, user: { id: user._id, email: user.email, name: user.name } };
  },
});

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { id: user._id, email: user.email, name: user.name };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { success: true };
  },
});