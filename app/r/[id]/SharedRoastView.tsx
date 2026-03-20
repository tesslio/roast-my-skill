"use client";

import Link from "next/link";
import RoastResult from "@/components/RoastResult";
import type { SavedRoast } from "@/lib/store";
import type { Persona } from "@/components/PersonaPicker";

export default function SharedRoastView({ roast }: { roast: SavedRoast }) {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        <div className="flex min-h-screen flex-col items-center py-16">
          <div className="w-full max-w-2xl space-y-4">
            <RoastResult
              result={roast.personaRoast}
              isStreaming={false}
              persona={roast.persona as Persona}
              metrics={roast.metrics}
              rawReview={roast.rawReview}
              customName={roast.customName ?? undefined}
            />

            {/* CTA */}
            <div
              className="border p-5 text-center"
              style={{ borderColor: "var(--border)" }}
            >
              <p
                className="mb-3 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Think you can do better?
              </p>
              <Link
                href="/"
                className="inline-block border px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:opacity-80"
                style={{
                  borderColor: "var(--text)",
                  backgroundColor: "var(--text)",
                  color: "var(--bg)",
                }}
              >
                Roast your own skill
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
