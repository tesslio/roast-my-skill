"use client";

import { useState } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Persona } from "./PersonaPicker";

interface Metrics {
  validation: number | null;
  discovery: number | null;
  implementation: number | null;
  finalScore: number | null;
  securityRating: string | null;
}

interface RoastResultProps {
  result: string;
  isStreaming: boolean;
  persona: Persona | null;
  metrics: Metrics | null;
  rawReview: string | null;
}

const PERSONA_STYLE: Record<
  string,
  { color: string; image: string; name: string; subtitle: string }
> = {
  engineer: {
    color: "var(--engineer)",
    image: "/engineer.png",
    name: "Condescending Jedi Dev",
    subtitle: "I felt a disturbance in your code",
  },
  grandma: {
    color: "var(--grandma)",
    image: "/grandma.png",
    name: "Grandma Thinks You Suck",
    subtitle: "Loves you but not your code",
  },
  parisian: {
    color: "var(--parisian)",
    image: "/parisian.png",
    name: "Rudest French Waiter",
    subtitle: "Alive · Serving contempt since 1987",
  },
};

const MOOD_EMOJIS: Record<string, Record<string, string>> = {
  engineer: {
    pleased: "😌",
    disappointed: "😔",
    angry: "😤",
    shocked: "😧",
    hopeful: "🤔",
  },
  grandma: {
    pleased: "🥰",
    disappointed: "😢",
    angry: "😡",
    shocked: "😱",
    hopeful: "🤞",
  },
  parisian: {
    pleased: "😏",
    disappointed: "😒",
    angry: "🤬",
    shocked: "😤",
    hopeful: "🙄",
  },
};

function pctColor(pct: number): string {
  if (pct >= 80) return "var(--engineer)";
  if (pct >= 50) return "#FBBF24";
  return "var(--red)";
}

function ScoreBlocks({ pct }: { pct: number }) {
  const filled = Math.round(pct / 10);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="h-2.5 w-2"
          style={{
            backgroundColor: i < filled ? pctColor(pct) : "var(--border)",
          }}
        />
      ))}
    </div>
  );
}

/** Parse mood markers and render character reactions inline */
function MoodReaction({
  mood,
  persona,
}: {
  mood: string;
  persona: string;
}) {
  const style = PERSONA_STYLE[persona] ?? PERSONA_STYLE.engineer;
  const emoji = MOOD_EMOJIS[persona]?.[mood] ?? "😐";

  return (
    <div className="my-3 flex items-center gap-2">
      <div
        className="relative h-7 w-7 shrink-0 overflow-hidden border"
        style={{ borderColor: style.color }}
      >
        <Image
          src={style.image}
          alt={mood}
          fill
          className="object-cover"
          sizes="28px"
        />
      </div>
      <span className="text-lg">{emoji}</span>
    </div>
  );
}

function HighlightedMarkdown({
  content,
  persona,
}: {
  content: string;
  persona: string;
}) {
  // Split content by mood markers
  const moodPattern = /^::mood:(\w+)::$/gm;
  const parts: { type: "text" | "mood"; value: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = moodPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "mood", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  // If no mood markers found, render everything as text
  if (parts.length === 0) {
    parts.push({ type: "text", value: content });
  }

  return (
    <>
      {parts.map((part, i) =>
        part.type === "mood" ? (
          <MoodReaction key={i} mood={part.value} persona={persona} />
        ) : (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ children, className }) => {
                const text = String(children).trim();
                const isMetric =
                  /^\d+(\.\d+)?%$/.test(text) ||
                  /^\d+(\.\d+)?\/\d+$/.test(text) ||
                  /^\d+(\.\d+)?x$/.test(text) ||
                  /^\+\d+/.test(text);

                if (isMetric && !className) {
                  let pct = 50;
                  const pctMatch = text.match(/^(\d+(?:\.\d+)?)%$/);
                  const fracMatch = text.match(
                    /^(\d+(?:\.\d+)?)\/(\d+)$/
                  );
                  if (pctMatch) pct = parseFloat(pctMatch[1]);
                  else if (fracMatch)
                    pct =
                      (parseFloat(fracMatch[1]) /
                        parseFloat(fracMatch[2])) *
                      100;

                  return (
                    <span
                      className="mx-0.5 inline-block border px-1.5 py-0.5 text-xs font-bold tabular-nums"
                      style={{
                        borderColor: pctColor(pct),
                        color: pctColor(pct),
                      }}
                    >
                      {text}
                    </span>
                  );
                }

                return <code className={className}>{children}</code>;
              },
            }}
          >
            {part.value}
          </ReactMarkdown>
        )
      )}
    </>
  );
}

export default function RoastResult({
  result,
  isStreaming,
  persona,
  metrics,
  rawReview,
}: RoastResultProps) {
  const [showRaw, setShowRaw] = useState(false);

  if (!result) return null;

  const style = PERSONA_STYLE[persona ?? "engineer"];
  const m = metrics;
  const hasMetrics =
    m &&
    (m.validation !== null ||
      m.discovery !== null ||
      m.implementation !== null);

  return (
    <div className="animate-slide-up w-full space-y-3">
      {/* Metrics dashboard */}
      {hasMetrics && (
        <div className="border p-5" style={{ borderColor: "var(--border)" }}>
          <p
            className="mb-4 text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--text-dim)" }}
          >
            Skill Assessment
          </p>

          <div className="space-y-3">
            {[
              {
                label: "Validation",
                desc: "Structure, frontmatter, format checks",
                value: m!.validation,
              },
              {
                label: "Discovery",
                desc: "Description quality, trigger accuracy",
                value: m!.discovery,
              },
              {
                label: "Implementation",
                desc: "Instruction clarity, completeness",
                value: m!.implementation,
              },
            ]
              .filter((row) => row.value !== null)
              .map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <div>
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--text)" }}
                      >
                        {row.label}
                      </span>
                      <span
                        className="ml-2 text-[10px]"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {row.desc}
                      </span>
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: pctColor(row.value!) }}
                    >
                      {row.value}%
                    </span>
                  </div>
                  <ScoreBlocks pct={row.value!} />
                </div>
              ))}
          </div>

          {m!.finalScore !== null && (
            <>
              <div
                className="my-4 h-px"
                style={{ backgroundColor: "var(--border)" }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--text)" }}
                >
                  Final Score
                </span>
                <span
                  className="text-3xl font-black tabular-nums"
                  style={{ color: pctColor(m!.finalScore) }}
                >
                  {m!.finalScore}
                  <span
                    className="text-sm font-normal"
                    style={{ color: "var(--text-dim)" }}
                  >
                    %
                  </span>
                </span>
              </div>
              <ScoreBlocks pct={m!.finalScore} />
            </>
          )}

          {m!.securityRating && (
            <div
              className="mt-3 flex items-center justify-between border-t pt-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: "var(--text-dim)" }}
              >
                Security
              </span>
              <span
                className="border px-2 py-0.5 text-xs font-bold uppercase"
                style={{
                  borderColor:
                    m!.securityRating === "LOW"
                      ? "var(--engineer)"
                      : m!.securityRating === "MEDIUM"
                        ? "#FBBF24"
                        : "var(--red)",
                  color:
                    m!.securityRating === "LOW"
                      ? "var(--engineer)"
                      : m!.securityRating === "MEDIUM"
                        ? "#FBBF24"
                        : "var(--red)",
                }}
              >
                {m!.securityRating}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Roast content */}
      <div className="border p-6" style={{ borderColor: "var(--border)" }}>
        <div
          className="mb-4 flex items-center gap-3 border-b pb-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="relative h-8 w-8 shrink-0 overflow-hidden border"
            style={{ borderColor: style.color }}
          >
            <Image
              src={style.image}
              alt={style.name}
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: style.color }}
            >
              {style.name}
            </p>
            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
              {style.subtitle}
            </p>
          </div>
        </div>

        <div className="roast-prose">
          <HighlightedMarkdown
            content={result}
            persona={persona ?? "engineer"}
          />
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-1.5"
              style={{
                backgroundColor: style.color,
                animation: "blink 0.8s step-end infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* View full review toggle */}
      {rawReview && !isStreaming && (
        <div className="border" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex w-full items-center justify-between px-4 py-3 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--bg-surface)]"
            style={{ color: "var(--text-muted)" }}
          >
            <span>View full technical review</span>
            <span>{showRaw ? "▲" : "▼"}</span>
          </button>
          {showRaw && (
            <div
              className="border-t px-4 py-4"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="roast-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {rawReview}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
