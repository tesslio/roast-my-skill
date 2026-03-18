"use client";

import { useState } from "react";

interface SkillInputProps {
  onSubmit: (type: "url", content: string) => void;
  isLoading: boolean;
}

export default function SkillInput({ onSubmit, isLoading }: SkillInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit("url", content.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <input
        type="url"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="https://github.com/owner/repo"
        className="w-full border px-4 py-3 text-sm outline-none placeholder:text-[var(--text-dim)]"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text)",
          fontFamily: "var(--font-mono), monospace",
        }}
      />

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
