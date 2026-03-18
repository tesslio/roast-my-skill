import { NextRequest, NextResponse } from "next/server";
import { fetchSkillFromGitHub, isGitHubUrl } from "@/lib/github";
import { runTesslReview } from "@/lib/tessl";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: { type: string; content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { content } = body;
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing content." }, { status: 400 });
  }

  if (!isGitHubUrl(content)) {
    return NextResponse.json(
      { error: "Please provide a valid GitHub URL." },
      { status: 400 }
    );
  }

  try {
    // Check for multiple skill files (repo root URL)
    const result = await fetchSkillFromGitHub(content);

    if (result.skillFiles) {
      return NextResponse.json({
        type: "pick",
        skillFiles: result.skillFiles,
      });
    }

    // Run real Tessl review via microservice (falls back to Claude API)
    const review = await runTesslReview(content, result.content);
    return NextResponse.json({
      type: "review",
      review: review.raw,
      metrics: review.metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
