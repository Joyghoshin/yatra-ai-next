"use client";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function TestMapPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Map test — Goa</h1>
      <LeafletMap />
    </div>
  );
}