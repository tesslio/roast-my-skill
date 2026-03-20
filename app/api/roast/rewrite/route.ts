import { NextRequest, NextResponse } from "next/server";
import { generatePersonaRoast } from "@/lib/personas";

const MAX_REVIEW_SIZE = 100 * 1024; // 100KB

/**
 * Step 2: Take the raw tessl review + chosen persona, stream a persona-styled roast.
 */
export async function POST(req: NextRequest) {
  let body: { review: string; persona: string; customDescription?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { review, persona, customDescription } = body;

  if (!review || typeof review !== "string") {
    return NextResponse.json({ error: "Missing review." }, { status: 400 });
  }

  if (review.length > MAX_REVIEW_SIZE) {
    return NextResponse.json(
      { error: "Review too large." },
      { status: 400 }
    );
  }

  const validPersonas = ["engineer", "grandma", "parisian", "custom"];
  if (!validPersonas.includes(persona)) {
    return NextResponse.json(
      { error: "Invalid persona." },
      { status: 400 }
    );
  }

  // Validate custom description
  if (persona === "custom") {
    if (!customDescription || typeof customDescription !== "string" || customDescription.trim().length === 0) {
      return NextResponse.json(
        { error: "Custom persona requires a description." },
        { status: 400 }
      );
    }
    if (customDescription.length > 200) {
      return NextResponse.json(
        { error: "Custom description too long (max 200 characters)." },
        { status: 400 }
      );
    }
  }

  try {
    const roastStream = await generatePersonaRoast(
      review,
      persona as "engineer" | "grandma" | "parisian" | "custom",
      customDescription?.slice(0, 200)
    );

    return new Response(roastStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
