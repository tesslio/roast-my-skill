import { NextRequest, NextResponse } from "next/server";
import { generatePersonaRoast } from "@/lib/personas";

const MAX_REVIEW_SIZE = 100 * 1024; // 100KB

/**
 * Step 2: Take the raw tessl review + chosen persona, stream a persona-styled roast.
 */
export async function POST(req: NextRequest) {
  let body: { review: string; persona: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { review, persona } = body;

  if (!review || typeof review !== "string") {
    return NextResponse.json({ error: "Missing review." }, { status: 400 });
  }

  if (review.length > MAX_REVIEW_SIZE) {
    return NextResponse.json(
      { error: "Review too large." },
      { status: 400 }
    );
  }

  const validPersonas = ["engineer", "grandma", "parisian"];
  if (!validPersonas.includes(persona)) {
    return NextResponse.json(
      { error: "Invalid persona." },
      { status: 400 }
    );
  }

  try {
    const roastStream = await generatePersonaRoast(
      review,
      persona as "engineer" | "grandma" | "parisian"
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
