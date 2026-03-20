import { NextRequest, NextResponse } from "next/server";
import { saveRoast } from "@/lib/store";

export async function POST(req: NextRequest) {
  let body: {
    persona: string;
    customName?: string;
    metrics: Record<string, unknown>;
    rawReview: string;
    personaRoast: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { persona, customName, metrics, rawReview, personaRoast } = body;

  if (!persona || !metrics || !rawReview || !personaRoast) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const id = await saveRoast({
      persona,
      customName: customName ?? null,
      metrics: {
        validation: (metrics.validation as number) ?? null,
        discovery: (metrics.discovery as number) ?? null,
        implementation: (metrics.implementation as number) ?? null,
        finalScore: (metrics.finalScore as number) ?? null,
        securityRating: (metrics.securityRating as string) ?? null,
      },
      rawReview,
      personaRoast,
    });

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Failed to save roast:", error);
    return NextResponse.json({ error: "Failed to save roast." }, { status: 500 });
  }
}
