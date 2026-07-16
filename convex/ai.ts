"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "openai/gpt-oss-120b";

export const generateItinerary = action({
  args: {
    destination: v.string(),
    mode: v.union(v.literal("india"), v.literal("international")),
    days: v.number(),
    budget: v.string(),
    preferences: v.array(v.string()),
  },
  handler: async (ctx, { destination, mode, days, budget, preferences }) => {
    const systemPrompt = `You are a travel itinerary planner. Respond ONLY with valid JSON matching this exact schema, no prose, no markdown fences:
{
  "destination": string,
  "totalDays": number,
  "days": [
    {
      "day": number,
      "title": string,
      "activities": [
        { "time": string, "name": string, "description": string, "estimatedCost": string, "lat": number, "lng": number }
      ],
      "hotelSuggestion": string,
      "hotelLat": number,
      "hotelLng": number
    }
  ]
}
Provide accurate real-world latitude/longitude coordinates for every activity and hotel suggestion.`;

    const currency = mode === "india" ? "Indian Rupees (₹)" : "US Dollars ($)";
    const userPrompt = `Plan a ${days}-day trip to ${destination} with a ${budget} budget. Preferences: ${preferences.join(", ") || "general sightseeing"}. All costs must be stated in ${currency}. Generate a realistic day-wise itinerary as JSON.`;

    const startTime = Date.now();

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const latencyMs = Date.now() - startTime;
      const usage = completion.usage;

      await ctx.runMutation(internal.llmUsage.logUsage, {
        feature: "generateItinerary",
        model: MODEL,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        latencyMs,
        success: true,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Groq returned an empty response.");

      try {
        return JSON.parse(raw);
      } catch {
        throw new Error("Groq returned invalid JSON: " + raw.slice(0, 300));
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      await ctx.runMutation(internal.llmUsage.logUsage, {
        feature: "generateItinerary",
        model: MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});

export const chatWithTrip = action({
  args: {
    tripContext: v.string(),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    message: v.string(),
  },
  handler: async (ctx, { tripContext, history, message }) => {
    const systemPrompt = `You are a helpful, friendly travel assistant for this specific trip. Use the trip details below to answer questions about packing, costs, hotels, food, local tips, and logistics. Keep answers concise and conversational, a few sentences at most unless asked for detail.\n\nTrip details:\n${tripContext}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history,
      { role: "user" as const, content: message },
    ];

    const startTime = Date.now();

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.6,
      });

      const latencyMs = Date.now() - startTime;
      const usage = completion.usage;

      await ctx.runMutation(internal.llmUsage.logUsage, {
        feature: "chatWithTrip",
        model: MODEL,
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        latencyMs,
        success: true,
      });

      const reply = completion.choices[0]?.message?.content;
      if (!reply) throw new Error("Groq returned an empty response.");

      return { reply };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      await ctx.runMutation(internal.llmUsage.logUsage, {
        feature: "chatWithTrip",
        model: MODEL,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs,
        success: false,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});