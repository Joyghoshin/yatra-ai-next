"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    title: "AI-planned itineraries",
    desc: "Tell it where, when, and what you're into — get a real day-by-day plan in seconds, not hours of tab-hopping.",
    icon: "✦",
  },
  {
    title: "Live maps & routes",
    desc: "Every activity plotted with an actual route from your hotel — see the shape of your day before you live it.",
    icon: "◈",
  },
  {
    title: "What's actually nearby",
    desc: "Restaurants, ATMs, hospitals, EV charging — pulled live around wherever you're staying, not a stale list.",
    icon: "◉",
  },
  {
    title: "Ask it anything",
    desc: "A trip assistant that already knows your itinerary — packing, budget, local tips, no re-explaining.",
    icon: "◐",
  },
  {
    title: "Flights, time zones, PDF",
    desc: "One click to search flights, a live clock next to home, and a proper offline PDF when you're ready to go.",
    icon: "◇",
  },
  {
    title: "Share it instantly",
    desc: "A read-only link for anyone you're traveling with — no account, no friction.",
    icon: "◆",
  },
];

const STEPS = [
  { n: "01", title: "Tell it your trip", desc: "Destination, dates, budget, what you're into." },
  { n: "02", title: "Get a real plan", desc: "A day-by-day itinerary with a hotel, routes, and real costs." },
  { n: "03", title: "Go", desc: "Maps, nearby places, flights, and a PDF — all in one link." },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF8F3" }}>
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
        <span
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-fraunces)", color: "#0F3D3E" }}
        >
          Yatra AI
        </span>
        <div className="flex gap-3 items-center">
          <Link href="/login" className="text-sm font-medium" style={{ color: "#0F3D3E" }}>
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium px-4 py-2 rounded-full text-white"
            style={{ backgroundColor: "#0F3D3E" }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div
          className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6"
          style={{ backgroundColor: "#F4A26122", color: "#B5651D" }}
        >
          Powered by Groq
        </div>
        <h1
          className="text-5xl sm:text-6xl leading-tight mb-6"
          style={{ fontFamily: "var(--font-fraunces)", color: "#0F3D3E" }}
        >
          Plan your next trip
          <br />
          in minutes, not hours.
        </h1>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "#5B6B6B" }}>
          A conversational travel planner that builds your itinerary, plots the routes,
          finds what&apos;s nearby, and answers your questions — before you&apos;ve
          finished your coffee.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-full text-white font-medium"
            style={{ backgroundColor: "#F4A261" }}
          >
            Plan your first trip
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-full font-medium border"
            style={{ borderColor: "#0F3D3E33", color: "#0F3D3E" }}
          >
            I already have an account
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid #0F3D3E14" }}
            >
              <div className="text-2xl mb-3" style={{ color: "#F4A261" }}>{f.icon}</div>
              <h3 className="font-semibold mb-2" style={{ color: "#0F3D3E" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#5B6B6B" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20" style={{ backgroundColor: "#0F3D3E" }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="text-3xl text-center mb-14"
            style={{ fontFamily: "var(--font-fraunces)", color: "#FBF8F3" }}
          >
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-10">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="text-sm font-mono mb-3" style={{ color: "#F4A261" }}>{s.n}</div>
                <h3 className="font-semibold mb-2" style={{ color: "#FBF8F3" }}>{s.title}</h3>
                <p className="text-sm" style={{ color: "#FBF8F3AA" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl mb-6" style={{ fontFamily: "var(--font-fraunces)", color: "#0F3D3E" }}>
          Your next trip is a few questions away.
        </h2>
        <Link
          href="/signup"
          className="inline-block px-6 py-3 rounded-full text-white font-medium"
          style={{ backgroundColor: "#F4A261" }}
        >
          Start planning — it&apos;s free
        </Link>
      </section>

      <footer className="border-t py-8 text-center text-xs" style={{ borderColor: "#0F3D3E14", color: "#5B6B6B" }}>
        Yatra AI — built with Groq, Convex &amp; OpenStreetMap
      </footer>
    </div>
  );
}