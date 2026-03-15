import { NextRequest, NextResponse } from "next/server";
import { fetchSkillFromGitHub, isGitHubUrl } from "@/lib/github";
import { runTesslReview } from "@/lib/tessl";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PASTE_SIZE = 50 * 1024;

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

  const { type, content } = body;
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing content." }, { status: 400 });
  }

  let skillContent: string;

  try {
    if (type === "url") {
      if (!isGitHubUrl(content)) {
        return NextResponse.json(
          { error: "Please provide a valid GitHub URL." },
          { status: 400 }
        );
      }
      skillContent = await fetchSkillFromGitHub(content);
    } else {
      if (content.length > MAX_PASTE_SIZE) {
        return NextResponse.json({ error: "Content too large (max 50KB)." }, { status: 400 });
      }
      skillContent = content;
    }

    const review = await runTesslReview(skillContent);
    return NextResponse.json({
      review: review.raw,
      metrics: review.metrics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
