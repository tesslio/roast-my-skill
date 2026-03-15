"use client";

import { useState } from "react";

type InputMode = "url" | "paste";

interface SkillInputProps {
  onSubmit: (type: InputMode, content: string) => void;
  isLoading: boolean;
}

export default function SkillInput({ onSubmit, isLoading }: SkillInputProps) {
  const [mode, setMode] = useState<InputMode>("url");
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit(mode, content.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-0">
        {(["url", "paste"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="border px-4 py-1.5 text-xs uppercase tracking-wider transition-colors"
            style={{
              borderColor: "var(--border)",
              backgroundColor:
                mode === m ? "var(--bg-surface)" : "transparent",
              color: mode === m ? "var(--text)" : "var(--text-dim)",
              marginRight: m === "url" ? "-1px" : "0",
            }}
          >
            {m === "url" ? "GitHub Link" : "Paste"}
          </button>
        ))}
      </div>

      {/* Input */}
      {mode === "url" ? (
        <input
          type="url"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="https://github.com/owner/repo/blob/main/skills/my-skill/SKILL.md"
          className="w-full border px-4 py-3 text-sm outline-none placeholder:text-[var(--text-dim)]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text)",
            fontFamily: "var(--font-mono), monospace",
          }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="paste your SKILL.md content here..."
          rows={8}
          className="w-full resize-none border px-4 py-3 text-sm outline-none placeholder:text-[var(--text-dim)]"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text)",
            fontFamily: "var(--font-mono), monospace",
          }}
        />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !content.trim()}
        className="w-full border py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          borderColor: "var(--text)",
          backgroundColor: "var(--text)",
          color: "var(--bg)",
        }}
      >
        Roast my skill
      </button>
    </form>
  );
}
