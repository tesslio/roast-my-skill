"use client";

import { useState } from "react";
import Image from "next/image";

export type Persona = "engineer" | "grandma" | "parisian" | "custom";

interface PersonaPickerProps {
  onPick: (persona: Persona, customDescription?: string) => void;
  reviewReady: boolean;
}

const PERSONAS: {
  id: Persona;
  name: string;
  image: string | null;
  color: string;
}[] = [
  {
    id: "engineer",
    name: "Condescending Jedi Dev",
    image: "/engineer.png",
    color: "var(--engineer)",
  },
  {
    id: "grandma",
    name: "Grandma Thinks You Suck",
    image: "/grandma.png",
    color: "var(--grandma)",
  },
  {
    id: "parisian",
    name: "Rudest French Waiter",
    image: "/parisian.png",
    color: "var(--parisian)",
  },
  // Custom persona hidden for now — code preserved in lib/personas.ts
  // {
  //   id: "custom",
  //   name: "Create Your Own",
  //   image: null,
  //   color: "var(--custom)",
  // },
];

export default function PersonaPicker({
  onPick,
  reviewReady,
}: PersonaPickerProps) {
  const [selectedId, setSelectedId] = useState<Persona | null>(null);
  const [hoveredId, setHoveredId] = useState<Persona | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDesc, setCustomDesc] = useState("");

  const handleClick = (id: Persona) => {
    if (selectedId) return;

    if (id === "custom") {
      setShowCustomInput(true);
      return;
    }

    setSelectedId(id);
    onPick(id);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDesc.trim()) return;
    setSelectedId("custom");
    setShowCustomInput(false);
    onPick("custom", customDesc.trim().slice(0, 200));
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
          Choose your
        </p>
        <h2 className="mt-1 text-2xl font-bold uppercase tracking-wider">
          Roaster
        </h2>
        <div className="mt-3">
          {!reviewReady ? (
            <span
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              <span
                className="inline-block h-1.5 w-1.5"
                style={{
                  backgroundColor: "var(--engineer)",
                  animation: "pulse-dot 1.5s infinite",
                }}
              />
              analyzing skill...
            </span>
          ) : !selectedId ? (
            <span className="animate-fade-in text-xs" style={{ color: "var(--engineer)" }}>
              analysis complete — pick a persona
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {PERSONAS.map((persona, i) => {
          const isSelected = selectedId === persona.id;
          const isDimmed = selectedId !== null && !isSelected;
          const isHovered = hoveredId === persona.id && !selectedId;
          const isCustomActive = showCustomInput && persona.id === "custom";

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleClick(persona.id)}
              onMouseEnter={() => setHoveredId(persona.id)}
              onMouseLeave={() => setHoveredId(null)}
              disabled={selectedId !== null}
              className="group relative flex flex-col items-center gap-2 disabled:cursor-default"
              style={{
                opacity: 0,
                animation: `fadeUp 0.3s ease-out ${i * 0.08}s forwards`,
              }}
            >
              <div
                className="relative aspect-square w-full overflow-hidden border-2 transition-all duration-200"
                style={{
                  borderColor: isSelected || isHovered || isCustomActive
                    ? persona.color
                    : "var(--border)",
                  filter: isDimmed ? "brightness(0.25) grayscale(1)" : "none",
                }}
              >
                {persona.image ? (
                  <Image
                    src={persona.image}
                    alt={persona.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 150px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "var(--bg-elevated)" }}>
                    <span
                      className="text-4xl font-bold sm:text-5xl"
                      style={{
                        color: isSelected || isHovered || isCustomActive ? persona.color : "var(--text-dim)",
                        fontFamily: "var(--font-mono), monospace",
                      }}
                    >
                      ?
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: isSelected || isHovered || isCustomActive ? persona.color : "var(--text)" }}
                  >
                    {persona.name}
                  </p>
                </div>

                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span
                      className="inline-block h-2 w-2"
                      style={{
                        backgroundColor: persona.color,
                        animation: "blink 0.8s step-end infinite",
                      }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom persona input */}
      {showCustomInput && !selectedId && (
        <form
          onSubmit={handleCustomSubmit}
          className="animate-fade-up mt-4 flex gap-2"
        >
          <input
            type="text"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="e.g. Gordon Ramsay, my disappointed dad, a pirate captain..."
            maxLength={200}
            autoFocus
            className="flex-1 border px-3 py-2.5 text-sm outline-none placeholder:text-[var(--text-dim)]"
            style={{
              borderColor: "var(--custom)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text)",
              fontFamily: "var(--font-mono), monospace",
            }}
          />
          <button
            type="submit"
            disabled={!customDesc.trim()}
            className="border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80 disabled:opacity-30"
            style={{
              borderColor: "var(--custom)",
              backgroundColor: "var(--custom)",
              color: "var(--bg)",
            }}
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
}
