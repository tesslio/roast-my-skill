"use client";

import { useState } from "react";
import Image from "next/image";

export type Persona = "engineer" | "grandma" | "parisian";

interface PersonaPickerProps {
  onPick: (persona: Persona) => void;
  reviewReady: boolean;
}

const PERSONAS: {
  id: Persona;
  name: string;
  image: string;
  color: string;
}[] = [
  {
    id: "engineer",
    name: "Enlightened Dev",
    image: "/engineer.png",
    color: "var(--engineer)",
  },
  {
    id: "grandma",
    name: "Grandma",
    image: "/grandma.png",
    color: "var(--grandma)",
  },
  {
    id: "parisian",
    name: "Parisian Waiter",
    image: "/parisian.png",
    color: "var(--parisian)",
  },
];

export default function PersonaPicker({
  onPick,
  reviewReady,
}: PersonaPickerProps) {
  const [selectedId, setSelectedId] = useState<Persona | null>(null);
  const [hoveredId, setHoveredId] = useState<Persona | null>(null);

  const handleClick = (id: Persona) => {
    if (selectedId) return;
    setSelectedId(id);
    onPick(id);
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
              ✓ analysis complete — pick a persona
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {PERSONAS.map((persona, i) => {
          const isSelected = selectedId === persona.id;
          const isDimmed = selectedId !== null && !isSelected;
          const isHovered = hoveredId === persona.id && !selectedId;

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
              {/* Image */}
              <div
                className="relative aspect-square w-full overflow-hidden border-2 transition-all duration-200"
                style={{
                  borderColor: isSelected || isHovered
                    ? persona.color
                    : "var(--border)",
                  filter: isDimmed ? "brightness(0.25) grayscale(1)" : "none",
                }}
              >
                <Image
                  src={persona.image}
                  alt={persona.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 33vw, 200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: isSelected || isHovered ? persona.color : "var(--text)" }}
                  >
                    {persona.name}
                  </p>
                </div>

                {/* Selected state */}
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
    </div>
  );
}
