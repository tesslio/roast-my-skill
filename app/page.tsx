"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import SkillInput from "@/components/SkillInput";
import RoastResult from "@/components/RoastResult";
import PersonaPicker, { type Persona } from "@/components/PersonaPicker";
import SkillFilePicker from "@/components/SkillFilePicker";

type Phase = "landing" | "loading" | "picking-file" | "picking" | "waiting" | "streaming" | "done";

interface SkillFile {
  path: string;
  url: string;
}

interface Metrics {
  validation: number | null;
  discovery: number | null;
  implementation: number | null;
  finalScore: number | null;
  securityRating: string | null;
}


export default function Home() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [reviewReady, setReviewReady] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [rawReview, setRawReview] = useState<string | null>(null);
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([]);
  const [customDescription, setCustomDescription] = useState<string | null>(null);

  const reviewRef = useRef<string | null>(null);
  const pendingPersonaRef = useRef<Persona | null>(null);
  const waitingStartRef = useRef<number>(0);
  const customDescRef = useRef<string | null>(null);

  const startRewrite = useCallback(
    async (review: string, persona: Persona) => {
      setPhase("streaming");
      setResult("");

      try {
        const res = await fetch("/api/roast/rewrite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review, persona, customDescription: customDescRef.current }),
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

  const handleSubmit = async (type: "paste" | "url", content: string, skipLoading = false) => {
    setError("");
    setResult("");
    setReviewReady(false);
    setSelectedPersona(null);
    setMetrics(null);
    setRawReview(null);
    setSkillFiles([]);
    reviewRef.current = null;
    pendingPersonaRef.current = null;

    // Show "Analyzing skill..." briefly, then persona picker while review runs in background
    setPhase("loading");

    // Auto-transition to persona picker after 3 seconds (unless file picker needed)
    const loadingTimer = setTimeout(() => {
      // Only transition if still in loading phase (not switched to picking-file)
      setPhase((prev) => (prev === "loading" ? "picking" : prev));
    }, 3000);

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

      if (data.type === "pick") {
        clearTimeout(loadingTimer);
        setSkillFiles(data.skillFiles);
        setPhase("picking-file");
        return;
      }

      reviewRef.current = data.review;
      setMetrics(data.metrics ?? null);
      setRawReview(data.review ?? null);
      setReviewReady(true);

      // If still on loading screen (review came back fast), go to persona picker
      setPhase((prev) => (prev === "loading" ? "picking" : prev));

      // If user already picked a persona while review was running
      if (pendingPersonaRef.current) {
        // Let the banter play for at least 12 seconds before transitioning
        const elapsed = Date.now() - waitingStartRef.current;
        const minWait = 12000;
        const delay = Math.max(0, minWait - elapsed);
        setTimeout(() => {
          startRewrite(data.review, pendingPersonaRef.current!);
        }, delay);
      }
    } catch (err) {
      clearTimeout(loadingTimer);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("landing");
    }
  };

  const handleFilePick = (url: string) => {
    handleSubmit("url", url);
  };

  const handlePersonaPick = (persona: Persona, customDesc?: string) => {
    setSelectedPersona(persona);
    if (customDesc) {
      setCustomDescription(customDesc);
      customDescRef.current = customDesc;
    }
    if (reviewRef.current) {
      setPhase("waiting");
      waitingStartRef.current = Date.now();
      setTimeout(() => {
        startRewrite(reviewRef.current!, persona);
      }, 12000);
    } else {
      pendingPersonaRef.current = persona;
      waitingStartRef.current = Date.now();
      setPhase("waiting");
    }
  };

  const handleReset = () => {
    setPhase("landing");
    setResult("");
    setError("");
    setReviewReady(false);
    setSelectedPersona(null);
    setMetrics(null);
    setRawReview(null);
    setSkillFiles([]);
    setCustomDescription(null);
    reviewRef.current = null;
    pendingPersonaRef.current = null;
    customDescRef.current = null;
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        {/* ===== LANDING ===== */}
        {phase === "landing" && (
          <div className="flex min-h-screen flex-col items-center justify-center pb-16">
            {/* Title */}
            <div
              className="animate-fade-up flex flex-col items-center"
              style={{ animationDelay: "0.05s", opacity: 0 }}
            >
              <div className="flex items-center gap-3 sm:gap-5">
                <Image
                  src="/fire.jpg"
                  alt="Fire"
                  width={56}
                  height={56}
                  style={{ objectFit: "contain" }}
                />
                <h1
                  className="text-5xl font-bold uppercase tracking-wider sm:text-6xl"
                  style={{
                    color: "var(--text)",
                    fontFamily: "var(--font-dm), system-ui, sans-serif",
                  }}
                >
                  ROAST
                </h1>
                <Image
                  src="/fire.jpg"
                  alt="Fire"
                  width={56}
                  height={56}
                  style={{ objectFit: "contain", transform: "scaleX(-1)" }}
                />
              </div>
              <p
                className="mt-1 text-lg tracking-widest sm:text-xl"
                style={{
                  color: "var(--engineer)",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                my skill
              </p>
            </div>

            {/* Description */}
            <p
              className="animate-fade-up mt-4 text-center text-sm"
              style={{
                color: "var(--text-muted)",
                animationDelay: "0.2s",
                opacity: 0,
              }}
            >
              Drop a GitHub link to your skill — pick your roast level
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

        {/* ===== LOADING ===== */}
        {phase === "loading" && (
          <div className="flex min-h-screen flex-col items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
              <span
                className="inline-block h-2 w-2"
                style={{
                  backgroundColor: "var(--engineer)",
                  animation: "pulse-dot 1.5s infinite",
                }}
              />
              Analyzing skill...
            </div>
          </div>
        )}

        {/* ===== PICKING FILE ===== */}
        {phase === "picking-file" && (
          <div className="flex min-h-screen flex-col items-center justify-center py-16">
            <div className="w-full max-w-lg">
              <SkillFilePicker files={skillFiles} onPick={handleFilePick} />

              <button
                onClick={handleReset}
                className="mt-6 w-full border px-4 py-2 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--bg-surface)] hover:text-white"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ===== PICKING ===== */}
        {phase === "picking" && (
          <div className="flex min-h-screen flex-col items-center justify-center py-16">
            <PersonaPicker
              onPick={handlePersonaPick}
              reviewReady={reviewReady}
            />
          </div>
        )}

        {/* ===== WAITING ===== */}
        {phase === "waiting" && selectedPersona && (
          <WaitingScreen persona={selectedPersona} customDescription={customDescription} />
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
                rawReview={rawReview}
                customName={customDescription ?? undefined}
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
                      Want to fix this?
                    </p>
                    <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      Spin up Claude Code and let Tessl optimize your skill automatically:
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

                  {/* Share */}
                  <ShareBar persona={selectedPersona} metrics={metrics} roastText={result} customName={customDescription ?? undefined} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareBar({ persona, metrics, roastText, customName }: { persona: Persona | null; metrics: Metrics | null; roastText: string; customName?: string }) {
  const personaName =
    persona === "custom" && customName
      ? customName
      : persona === "engineer"
        ? "Condescending Jedi Dev"
        : persona === "grandma"
          ? "Grandma Thinks You Suck"
          : "Rudest French Waiter Alive";

  // Extract a funny one-liner from the roast for sharing
  const lines = roastText.split("\n").filter(l => l.trim().length > 20 && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith("-") && !l.includes("::mood:"));
  const funnyLine = lines.length > 0 ? `"${lines[0].trim().slice(0, 120)}${lines[0].trim().length > 120 ? "..." : ""}"` : "";

  const scoreText = metrics?.finalScore != null ? `Score: ${metrics.finalScore}%` : "";
  const breakdown = [
    metrics?.validation != null ? `Validation ${metrics.validation}%` : "",
    metrics?.discovery != null ? `Discovery ${metrics.discovery}%` : "",
    metrics?.implementation != null ? `Implementation ${metrics.implementation}%` : "",
  ].filter(Boolean).join(" | ");

  const tweetParts = [
    `My SKILL.md just got roasted by "${personaName}"`,
    scoreText ? `\n\n${scoreText}` : "",
    breakdown ? `(${breakdown})` : "",
    funnyLine ? `\n\n${funnyLine}` : "",
    `\n\nTry it yourself:`,
  ].filter(Boolean).join(" ");

  const text = encodeURIComponent(tweetParts);
  const url = encodeURIComponent("https://roast-my-skill.vercel.app");

  // LinkedIn only supports URL (it pulls OG tags), so we use a text-based share for platforms that support it
  const shareText = [
    `My SKILL.md just got roasted by "${personaName}"`,
    scoreText ? `\n\n${scoreText}` : "",
    breakdown ? ` (${breakdown})` : "",
    funnyLine ? `\n\n${funnyLine}` : "",
    `\n\nhttps://roast-my-skill.vercel.app`,
  ].filter(Boolean).join("");

  const encodedShareText = encodeURIComponent(shareText);

  const channels = [
    {
      name: "Twitter",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${encodedShareText}`,
    },
    {
      name: "Bluesky",
      href: `https://bsky.app/intent/compose?text=${encodedShareText}`,
    },
    {
      name: "Reddit",
      href: `https://www.reddit.com/submit?url=${decodeURIComponent(url)}&title=${encodeURIComponent(`My SKILL.md scored ${scoreText} — roasted by "${personaName}"`)}`,
    },
    {
      name: "HN",
      href: `https://news.ycombinator.com/submitlink?u=${url}&t=${encodeURIComponent(`Roast My Skill – My skill scored ${scoreText} via "${personaName}"`)}`,
    },
  ];

  return (
    <div
      className="animate-fade-up border p-5 text-center"
      style={{
        borderColor: "var(--text)",
        animationDelay: "0.4s",
        opacity: 0,
      }}
    >
      <p
        className="mb-4 text-xs font-bold uppercase tracking-widest"
        style={{ color: "var(--text)" }}
      >
        Share your roast
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {channels.map((ch) => (
          <a
            key={ch.name}
            href={ch.href}
            target="_blank"
            rel="noopener noreferrer"
            className="border px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--text)",
              backgroundColor: "var(--text)",
              color: "var(--bg)",
            }}
          >
            {ch.name}
          </a>
        ))}
      </div>
    </div>
  );
}

const WAITING_LINES: Record<string, string[]> = {
  engineer: [
    "Hmm... let me reach out through the Force...",
    "I sense... questionable choices already.",
    "The Jedi archives are being consulted.",
    "Your skill is being weighed by the Council.",
    "I've seen padawans submit better work in their sleep...",
    "The Force reveals all. Even the parts you hoped I'd miss.",
    "Almost there. I'm composing my disappointment.",
    "Patience, young one. A thorough roast takes time.",
  ],
  grandma: [
    "Hold on sweetheart, grandma's reading...",
    "Oh honey... oh no... oh HONEY.",
    "Let me get my good glasses for this one.",
    "I'm calling your cousin Timmy to compare.",
    "Baby, grandma has seen some things but THIS...",
    "I need a moment. And maybe a drink.",
    "Almost done, sugar. Grandma's got a LOT to say.",
    "Just warming up the oven for this roast, dear.",
  ],
  parisian: [
    "*sighs in French*",
    "Mon dieu... what have they presented me with.",
    "I am already regretting opening this file.",
    "Let me pour myself a glass of wine first.",
    "The audacity of submitting this to ME...",
    "I have seen better structure in a fallen soufflé.",
    "Patience. A proper critique cannot be rushed.",
    "Almost ready. My contempt needs time to marinate.",
  ],
  custom: [
    "Getting into character...",
    "Reading through your skill file now...",
    "Oh, this is going to be interesting.",
    "Forming some strong opinions here...",
    "I have thoughts. Many thoughts.",
    "This is... something. Definitely something.",
    "Almost ready to deliver the verdict.",
    "Preparing my most devastating lines...",
  ],
};

function WaitingScreen({ persona, customDescription }: { persona: Persona; customDescription?: string | null }) {
  const [visibleLines, setVisibleLines] = useState<number>(1);
  const [showHangTight, setShowHangTight] = useState(false);
  const lines = WAITING_LINES[persona] ?? WAITING_LINES.engineer;

  const personaStyle: Record<string, { color: string; image: string | null; name: string }> = {
    engineer: { color: "var(--engineer)", image: "/engineer.png", name: "Condescending Jedi Dev" },
    grandma: { color: "var(--grandma)", image: "/grandma.png", name: "Grandma Thinks You Suck" },
    parisian: { color: "var(--parisian)", image: "/parisian.png", name: "Rudest French Waiter" },
    custom: { color: "var(--custom)", image: null, name: customDescription ?? "Custom Roaster" },
  };

  const style = personaStyle[persona];

  useEffect(() => {
    // Reveal a new line every 4 seconds
    const interval = setInterval(() => {
      setVisibleLines((v) => {
        if (v >= lines.length) {
          clearInterval(interval);
          return v;
        }
        return v + 1;
      });
    }, 4000);

    // Show "hang tight" after 30s
    const hangTightTimer = setTimeout(() => setShowHangTight(true), 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(hangTightTimer);
    };
  }, [lines.length]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-16">
      <div className="w-full max-w-md space-y-6">
        {/* Character header */}
        <div className="flex items-center gap-4">
          <div
            className="relative h-16 w-16 shrink-0 overflow-hidden border-2"
            style={{ borderColor: style.color }}
          >
            {style.image ? (
              <Image
                src={style.image}
                alt={style.name}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "var(--bg-elevated)" }}>
                <span className="text-2xl font-bold" style={{ color: style.color, fontFamily: "var(--font-mono), monospace" }}>?</span>
              </div>
            )}
          </div>
          <div>
            <p
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: style.color }}
            >
              {style.name}
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              is reviewing your skill...
            </p>
          </div>
        </div>

        {/* Chat-style lines */}
        <div className="space-y-3">
          {lines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="animate-fade-up border-l-2 pl-4 text-sm"
              style={{
                borderColor: style.color,
                color: "var(--text-muted)",
                animationDelay: "0s",
              }}
            >
              {line}
            </div>
          ))}

          {/* Typing indicator */}
          {visibleLines < lines.length && (
            <div className="flex items-center gap-1.5 pl-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: style.color,
                    opacity: 0.4,
                    animation: `pulse-dot 1.2s infinite ${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* In-character "hang tight" message */}
        {showHangTight && (
          <div
            className="animate-fade-up border-l-2 pl-4 text-sm italic"
            style={{
              borderColor: style.color,
              color: style.color,
            }}
          >
            {persona === "engineer" &&
              "The Council's judges require about 60 more seconds, young padawan. The Force cannot be rushed."}
            {persona === "grandma" &&
              "Sweetheart, grandma's AI friends need about 60 more seconds to finish reading this. Be patient, baby."}
            {persona === "parisian" &&
              "The judges require another 60 seconds. A proper Michelin review is never rushed, even for... this."}
            {persona === "custom" &&
              "The AI judges need about 60 more seconds to finish their deep review. Almost there..."}
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalCta() {
  const [copied, setCopied] = useState(false);
  const command = "npx tessl skill review --optimize ./path-to-skill-folder";

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
