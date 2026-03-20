import { kv } from "@vercel/kv";
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

const ROAST_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export async function saveRoast(
  data: Omit<SavedRoast, "id" | "createdAt">
): Promise<string> {
  const id = nanoid(10);
  const roast: SavedRoast = {
    ...data,
    id,
    createdAt: Date.now(),
  };
  await kv.set(`roast:${id}`, JSON.stringify(roast), { ex: ROAST_TTL });
  return id;
}

export async function getRoast(id: string): Promise<SavedRoast | null> {
  const data = await kv.get<string>(`roast:${id}`);
  if (!data) return null;
  try {
    return typeof data === "string" ? JSON.parse(data) : data as unknown as SavedRoast;
  } catch {
    return null;
  }
}
