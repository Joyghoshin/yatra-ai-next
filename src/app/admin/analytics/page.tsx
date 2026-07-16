"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Must match ADMIN_EMAIL in convex/llmUsage.ts
const ADMIN_EMAIL = "joyghoshin@gmail.com";

// Groq pricing for openai/gpt-oss-120b as of July 2026 — check groq.com/pricing if this drifts.
const INPUT_COST_PER_MILLION = 0.15;
const OUTPUT_COST_PER_MILLION = 0.6;

interface UsageRecord {
  _id: string;
  _creationTime: number;
  userId?: string;
  tripId?: string;
  feature: "generateItinerary" | "chatWithTrip";
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: number;
}

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-black">{value}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const token = useAuthStore((s) => s.token);
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Correct Convex conditional fetching implementation
  const records = useQuery(
    api.llmUsage.getUsageStats,
    token && isAdmin ? { token } : "skip"
  ) as UsageRecord[] | undefined;

  // 1. Wait for both user object AND backend tokens to settle completely
  if (authLoading || (user && !token)) {
    return <div className="p-8 text-center text-gray-500">Authenticating admin session...</div>;
  }

  // 2. Gatekeeper validation occurs safely after states load
  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center text-red-500">
        You don&apos;t have access to this dashboard.
      </div>
    );
  }

  // 3. Data-fetching state check
  if (records === undefined) {
    return <div className="p-8 text-center text-gray-500">Loading usage data...</div>;
  }

  const totalCalls = records.length;
  const successCount = records.filter((r) => r.success).length;
  const failureCount = totalCalls - successCount;
  const successRate = totalCalls > 0 ? ((successCount / totalCalls) * 100).toFixed(1) : "0";

  const totalPromptTokens = records.reduce((sum, r) => sum + r.promptTokens, 0);
  const totalCompletionTokens = records.reduce((sum, r) => sum + r.completionTokens, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;

  const estimatedCost =
    (totalPromptTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (totalCompletionTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  const successfulRecords = records.filter((r) => r.success);
  const avgLatency =
    successfulRecords.length > 0
      ? Math.round(successfulRecords.reduce((sum, r) => sum + r.latencyMs, 0) / successfulRecords.length)
      : 0;

  // Chronological order for the time-series chart
  const chronological = [...records].sort((a, b) => a.createdAt - b.createdAt);
  let cumulative = 0;
  const timeSeriesData = chronological.map((r, i) => {
    cumulative += r.totalTokens;
    return {
      call: i + 1,
      tokens: r.totalTokens,
      cumulativeTokens: cumulative,
      time: new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  });

  const featureBreakdown = [
    {
      feature: "Itinerary generation",
      calls: records.filter((r) => r.feature === "generateItinerary").length,
      tokens: records
        .filter((r) => r.feature === "generateItinerary")
        .reduce((sum, r) => sum + r.totalTokens, 0),
    },
    {
      feature: "Trip chatbot",
      calls: records.filter((r) => r.feature === "chatWithTrip").length,
      tokens: records
        .filter((r) => r.feature === "chatWithTrip")
        .reduce((sum, r) => sum + r.totalTokens, 0),
    },
  ];

  const recentCalls = [...records].slice(0, 20);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">LLM Usage & Performance</h1>
      <p className="text-sm text-gray-500 mb-6">
        Last {totalCalls} calls to Groq ({records[0]?.model ?? "openai/gpt-oss-120b"})
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total calls" value={totalCalls.toString()} />
        <StatCard label="Success rate" value={`${successRate}%`} sublabel={`${failureCount} failed`} />
        <StatCard label="Total tokens" value={totalTokens.toLocaleString()} />
        <StatCard label="Est. cost" value={`$${estimatedCost.toFixed(4)}`} sublabel="at current Groq rates" />
        <StatCard label="Avg latency" value={`${(avgLatency / 1000).toFixed(2)}s`} />
      </div>

      {/* Tokens over time */}
      <div className="border rounded-lg p-4 bg-white mb-6">
        <h2 className="text-sm font-semibold mb-3">Cumulative tokens consumed</h2>
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData} margin={{ left: 10, right: 10, bottom: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="call" tick={{ fontSize: 11 }} label={{ value: "Call #", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="cumulativeTokens" stroke="#0F3D3E" strokeWidth={2} dot={false} name="Cumulative tokens" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        {/* Feature breakdown */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold mb-3">Tokens by feature</h2>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="feature" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tokens" fill="#F4A261" name="Total tokens" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tokens per call */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="text-sm font-semibold mb-3">Tokens per call</h2>
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="call" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="tokens" fill="#0F3D3E" name="Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent calls table */}
      <div className="border rounded-lg p-4 bg-white overflow-x-auto">
        <h2 className="text-sm font-semibold mb-3">Recent calls</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="pb-2 pr-4">Time</th>
              <th className="pb-2 pr-4">Feature</th>
              <th className="pb-2 pr-4">Tokens</th>
              <th className="pb-2 pr-4">Latency</th>
              <th className="pb-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentCalls.map((r) => (
              <tr key={r._id} className="border-b last:border-0">
                <td className="py-2 pr-4 text-gray-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="py-2 pr-4">
                  {r.feature === "generateItinerary" ? "Itinerary generation" : "Trip chatbot"}
                </td>
                <td className="py-2 pr-4">{r.totalTokens.toLocaleString()}</td>
                <td className="py-2 pr-4">{(r.latencyMs / 1000).toFixed(2)}s</td>
                <td className="py-2 pr-4">
                  {r.success ? (
                    <span className="text-green-600">Success</span>
                  ) : (
                    <span className="text-red-500" title={r.errorMessage}>
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}