import { put, head } from "@vercel/blob";
import { nanoid } from "nanoid";

export interface SavedRoast {
  id: string;
  persona: string;
  customName: string | null;
  metrics: {
    validation: number | null;
    discovery: number | null;
    implementation: number | null;
    finalScore: number | null;
    securityRating: string | null;
  };
  rawReview: string;
  personaRoast: string;
  createdAt: number;
}

export async function saveRoast(
  data: Omit<SavedRoast, "id" | "createdAt">
): Promise<string> {
  const id = nanoid(10);
  const roast: SavedRoast = {
    ...data,
    id,
    createdAt: Date.now(),
  };

  await put(`roasts/${id}.json`, JSON.stringify(roast), {
    access: "public",
    contentType: "application/json",
  });

  return id;
}

export async function getRoast(id: string): Promise<SavedRoast | null> {
  // Validate ID format to prevent path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;

  try {
    const blob = await head(`roasts/${id}.json`);
    if (!blob) return null;

    const res = await fetch(blob.url);
    if (!res.ok) return null;

    return (await res.json()) as SavedRoast;
  } catch {
    return null;
  }
}
