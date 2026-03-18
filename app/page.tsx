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
  const [rawReview, setRawReview] = useState<string | null>(null);
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([]);

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

    // For URLs (first time), show loading to check for multiple skill files
    // For paste or after file pick, show persona picker immediately
    setPhase(type === "url" && !skipLoading ? "loading" : "picking");

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
        // Multiple SKILL.md files — let user pick
        setSkillFiles(data.skillFiles);
        setPhase("picking-file");
        return;
      }

      reviewRef.current = data.review;
      setMetrics(data.metrics ?? null);
      setRawReview(data.review ?? null);
      setReviewReady(true);

      // If we were in loading phase (URL first submit), now show persona picker
      if (type === "url" && !skipLoading) {
        setPhase("picking");
      }

      // If user already picked a persona while review was running (paste flow)
      if (pendingPersonaRef.current) {
        startRewrite(data.review, pendingPersonaRef.current);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("landing");
    }
  };

  const handleFilePick = (url: string) => {
    // We already know it's a single file — go straight to persona picker
    handleSubmit("url", url, true);
  };

  const handlePersonaPick = (persona: Persona) => {
    setSelectedPersona(persona);
    if (reviewRef.current) {
      startRewrite(reviewRef.current, persona);
    } else {
      pendingPersonaRef.current = persona;
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
    reviewRef.current = null;
    pendingPersonaRef.current = null;
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-6">
        {/* ===== LANDING ===== */}
        {phase === "landing" && (
          <div className="flex min-h-screen flex-col items-center justify-center pb-16">
            {/* Title with fire */}
            <div
              className="animate-fade-up flex items-center justify-center gap-4"
              style={{ animationDelay: "0.05s", opacity: 0 }}
            >
              <Image
                src="/fire.jpg"
                alt="Fire"
                width={80}
                height={80}
                className="hidden sm:block"
                style={{ objectFit: "contain" }}
              />
              <pre
                className="select-none text-center text-[0.45rem] leading-[1.1] sm:text-[0.55rem] md:text-xs"
                style={{ color: "var(--text)" }}
              >
                {ASCII_TITLE}
              </pre>
              <Image
                src="/fire.jpg"
                alt="Fire"
                width={80}
                height={80}
                className="hidden sm:block"
                style={{ objectFit: "contain", transform: "scaleX(-1)" }}
              />
            </div>

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
          <WaitingScreen persona={selectedPersona} />
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
                  <ShareBar persona={selectedPersona} metrics={metrics} roastText={result} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareBar({ persona, metrics, roastText }: { persona: Persona | null; metrics: Metrics | null; roastText: string }) {
  const personaName =
    persona === "engineer"
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
};

function WaitingScreen({ persona }: { persona: Persona }) {
  const [visibleLines, setVisibleLines] = useState<number>(1);
  const [showHangTight, setShowHangTight] = useState(false);
  const lines = WAITING_LINES[persona] ?? WAITING_LINES.engineer;

  const personaStyle: Record<string, { color: string; image: string; name: string }> = {
    engineer: { color: "var(--engineer)", image: "/engineer.png", name: "Condescending Jedi Dev" },
    grandma: { color: "var(--grandma)", image: "/grandma.png", name: "Grandma Thinks You Suck" },
    parisian: { color: "var(--parisian)", image: "/parisian.png", name: "Rudest French Waiter" },
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
            <Image
              src={style.image}
              alt={style.name}
              fill
              className="object-cover"
              sizes="64px"
            />
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

        {/* Hang tight message */}
        {showHangTight && (
          <div
            className="animate-fade-up border px-4 py-3 text-center text-xs"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-dim)",
            }}
          >
            Tessl is running a deep review with AI judges — this takes about 60 seconds. Hang tight.
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
