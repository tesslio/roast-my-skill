"use client";

import { useState, useRef, useCallback } from "react";
import SkillInput from "@/components/SkillInput";
import RoastResult from "@/components/RoastResult";
import PersonaPicker, { type Persona } from "@/components/PersonaPicker";

type Phase = "landing" | "picking" | "streaming" | "done";

interface Metrics {
  validation: number | null;
  discovery: number | null;
  implementation: number | null;
  finalScore: number | null;
  securityRating: string | null;
}

const ASCII_TITLE = `
██████╗  ██████╗  █████╗ ███████╗████████╗
██╔══██╗██╔═══██╗██╔══██╗██╔════╝╚══██╔══╝
██████╔╝██║   ██║███████║███████╗   ██║
██╔══██╗██║   ██║██╔══██║╚════██║   ██║
██║  ██║╚██████╔╝██║  ██║███████║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝
`.trim();

export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [reviewReady, setReviewReady] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const reviewRef = useRef<string | null>(null);
  const pendingPersonaRef = useRef<Persona | null>(null);

  const startRewrite = useCallback(
    async (review: string, persona: Persona) => {
      setPhase("streaming");
      setResult("");

      try {
        const res = await fetch("/api/roast/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review, persona }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Rewrite failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("No response stream.");

        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }

        setPhase("done");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setPhase("landing");
      }
    },
    []
  );

  const handleSubmit = async (type: "paste" | "url", content: string) => {
    setPhase("picking");
    setError("");
    setResult("");
    setReviewReady(false);
    setSelectedPersona(null);
    setMetrics(null);
    reviewRef.current = null;
    pendingPersonaRef.current = null;

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Review failed (${res.status})`);
      }

      const data = await res.json();
      reviewRef.current = data.review;
      setMetrics(data.metrics ?? null);
      setReviewReady(true);

      if (pendingPersonaRef.current) {
        startRewrite(data.review, pendingPersonaRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("landing");
    }
  };

  const handlePersonaPick = (persona: Persona) => {
    setSelectedPersona(persona);

    if (reviewRef.current) {
      startRewrite(reviewRef.current, persona);
    } else {
      pendingPersonaRef.current = persona;
    }
  };

  const handleReset = () => {
    setPhase("landing");
    setResult("");
    setError("");
    setReviewReady(false);
    setSelectedPersona(null);
    setMetrics(null);
    reviewRef.current = null;
    pendingPersonaRef.current = null;
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        {/* ===== LANDING ===== */}
        {phase === "landing" && (
          <div className="flex min-h-screen flex-col items-center justify-center pb-16">
            {/* ASCII art title */}
            <pre
              className="animate-fade-up select-none text-center text-[0.45rem] leading-[1.1] sm:text-[0.55rem] md:text-xs"
              style={{ color: "var(--text)", animationDelay: "0.05s", opacity: 0 }}
            >
              {ASCII_TITLE}
            </pre>

            {/* Subtitle */}
            <p
              className="animate-fade-up mt-4 text-center text-sm tracking-widest uppercase"
              style={{
                color: "var(--text-dim)",
                animationDelay: "0.15s",
                opacity: 0,
                letterSpacing: "0.2em",
              }}
            >
              my-skill
            </p>

            {/* Divider */}
            <div
              className="animate-fade-up my-8 h-px w-full max-w-md"
              style={{
                background: "var(--border)",
                animationDelay: "0.2s",
                opacity: 0,
              }}
            />

            {/* Description */}
            <p
              className="animate-fade-up text-center text-sm"
              style={{
                color: "var(--text-muted)",
                animationDelay: "0.25s",
                opacity: 0,
              }}
            >
              Drop your{" "}
              <code
                className="border px-1.5 py-0.5 text-xs"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                SKILL.md
              </code>{" "}
              — pick your roast level
            </p>

            {/* Input */}
            <div
              className="animate-fade-up mt-8 w-full"
              style={{ animationDelay: "0.3s", opacity: 0 }}
            >
              <SkillInput onSubmit={handleSubmit} isLoading={false} />
            </div>

            {/* Error */}
            {error && (
              <div
                className="animate-fade-up mt-4 w-full border p-4 text-center text-sm"
                style={{
                  borderColor: "var(--red)",
                  color: "var(--red)",
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* ===== PICKING ===== */}
        {phase === "picking" && (
          <div className="flex min-h-screen flex-col items-center justify-center py-16">
            <PersonaPicker
              onPick={handlePersonaPick}
              reviewReady={reviewReady}
            />

            {selectedPersona && !reviewReady && (
              <div
                className="animate-fade-up mt-8 flex items-center gap-3 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <span
                  className="inline-block h-2 w-2"
                  style={{ backgroundColor: "var(--text-muted)", animation: "blink 1s step-end infinite" }}
                />
                {selectedPersona === "engineer" && "meditating on your failures..."}
                {selectedPersona === "grandma" && "grandma is reading..."}
                {selectedPersona === "parisian" && "preparing contempt..."}
              </div>
            )}
          </div>
        )}

        {/* ===== RESULT ===== */}
        {(phase === "streaming" || phase === "done") && (
          <div className="flex min-h-screen flex-col items-center py-16">
            <div className="w-full max-w-2xl space-y-4">
              <RoastResult
                result={result}
                isStreaming={phase === "streaming"}
                persona={selectedPersona}
                metrics={metrics}
              />

              {phase === "done" && result && (
                <>
                  {/* CTA */}
                  <div
                    className="animate-slide-up border p-5"
                    style={{
                      borderColor: "var(--border)",
                      animationDelay: "0.2s",
                      opacity: 0,
                    }}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text)" }}>
                      Full review
                    </p>
                    <p className="mb-3 text-xs" style={{ color: "var(--text-dim)" }}>
                      Run in your terminal:
                    </p>
                    <TerminalCta />
                  </div>

                  {/* Actions */}
                  <div
                    className="animate-fade-up flex justify-center gap-3"
                    style={{ animationDelay: "0.3s", opacity: 0 }}
                  >
                    <button
                      onClick={handleReset}
                      className="border px-4 py-2 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                    >
                      Roast another
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="border px-4 py-2 text-xs uppercase tracking-wider text-black transition-colors hover:opacity-80"
                      style={{
                        borderColor: "var(--text)",
                        backgroundColor: "var(--text)",
                      }}
                    >
                      Copy roast
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalCta() {
  const [copied, setCopied] = useState(false);
  const command = "npx tessl skill review ./path-to-skill-folder";

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 overflow-x-auto border px-4 py-2.5 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--engineer)" }}
      >
        <span style={{ color: "var(--text-dim)" }}>$ </span>
        {command}
      </div>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(command);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="border px-3 py-2.5 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
