import Anthropic from "@anthropic-ai/sdk";

export interface TesslMetrics {
  validation: number | null;
  discovery: number | null;
  implementation: number | null;
  finalScore: number | null;
  securityRating: string | null;
}

export interface TesslReview {
  raw: string;
  metrics: TesslMetrics;
}

// ─── Real Tessl CLI types ───

interface TesslCheck {
  name: string;
  status: "passed" | "warning" | "error";
  message: string;
}

interface TesslJudgeScore {
  score: number;
  reasoning: string;
}

interface TesslJudge {
  success: boolean;
  evaluation: {
    scores: Record<string, TesslJudgeScore>;
    overall_assessment: string;
    suggestions: string[];
  };
  normalizedScore: number;
}

interface TesslCliOutput {
  review: { reviewScore: number };
  validation: {
    checks: TesslCheck[];
    overallPassed: boolean;
    errorCount: number;
    warningCount: number;
    skillName: string;
    skillDescription: string;
  };
  descriptionJudge: TesslJudge;
  contentJudge: TesslJudge;
}

// ─── Map real Tessl output to our metrics ───

function mapTesslMetrics(data: TesslCliOutput): TesslMetrics {
  const checks = data.validation?.checks ?? [];
  const passed = checks.filter((c) => c.status === "passed").length;
  const total = checks.length || 1;

  const hasSecurityIssue = checks.some(
    (c) =>
      c.status === "error" &&
      c.name.toLowerCase().includes("security")
  );

  return {
    validation: Math.round((passed / total) * 100),
    discovery: Math.round((data.descriptionJudge?.normalizedScore ?? 0) * 100),
    implementation: Math.round((data.contentJudge?.normalizedScore ?? 0) * 100),
    finalScore: data.review?.reviewScore ?? null,
    securityRating: hasSecurityIssue ? "HIGH" : "LOW",
  };
}

// ─── Build readable markdown from real Tessl data ───

function buildMarkdownReview(data: TesslCliOutput): string {
  const parts: string[] = [];

  // Skill info
  if (data.validation?.skillName) {
    parts.push(`## Skill: ${data.validation.skillName}\n`);
    if (data.validation.skillDescription) {
      parts.push(`> ${data.validation.skillDescription}\n`);
    }
  }

  // Validation
  const warnings = (data.validation?.checks ?? []).filter(
    (c) => c.status === "warning" || c.status === "error"
  );
  if (warnings.length > 0) {
    parts.push("## Validation Issues\n");
    for (const w of warnings) {
      parts.push(`- **${w.status.toUpperCase()}**: ${w.message}`);
    }
    parts.push("");
  }

  // Description Judge
  if (data.descriptionJudge?.evaluation) {
    const dj = data.descriptionJudge.evaluation;
    parts.push("## Description Quality\n");
    parts.push(dj.overall_assessment);
    parts.push("");

    parts.push("| Criterion | Score | Reasoning |");
    parts.push("|-----------|-------|-----------|");
    for (const [name, detail] of Object.entries(dj.scores)) {
      const label = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      parts.push(`| ${label} | ${detail.score}/3 | ${detail.reasoning} |`);
    }
    parts.push("");
  }

  // Content Judge
  if (data.contentJudge?.evaluation) {
    const cj = data.contentJudge.evaluation;
    parts.push("## Content Quality\n");
    parts.push(cj.overall_assessment);
    parts.push("");

    parts.push("| Criterion | Score | Reasoning |");
    parts.push("|-----------|-------|-----------|");
    for (const [name, detail] of Object.entries(cj.scores)) {
      const label = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      parts.push(`| ${label} | ${detail.score}/3 | ${detail.reasoning} |`);
    }
    parts.push("");
  }

  // Final score
  if (data.review?.reviewScore != null) {
    parts.push(`## Final Score: ${data.review.reviewScore}/100\n`);
  }

  // Suggestions (merged from both judges)
  const suggestions = [
    ...(data.descriptionJudge?.evaluation?.suggestions ?? []),
    ...(data.contentJudge?.evaluation?.suggestions ?? []),
  ];
  if (suggestions.length > 0) {
    parts.push("## Suggestions\n");
    for (const s of suggestions) {
      parts.push(`- ${s}`);
    }
  }

  return parts.join("\n");
}

// ─── Primary: call Tessl microservice ───

async function runTesslReviewViaService(
  githubUrl: string
): Promise<TesslReview> {
  const serviceUrl = process.env.TESSL_MICROSERVICE_URL;
  const apiKey = process.env.TESSL_MICROSERVICE_API_KEY;

  if (!serviceUrl || !apiKey) {
    throw new Error("Tessl microservice not configured");
  }

  const res = await fetch(`${serviceUrl}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url: githubUrl }),
    signal: AbortSignal.timeout(150_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `Tessl service error (${res.status})`
    );
  }

  const data = (await res.json()) as TesslCliOutput;
  return {
    raw: buildMarkdownReview(data),
    metrics: mapTesslMetrics(data),
  };
}

// ─── Fallback: Claude API review (if microservice is down) ───

const FALLBACK_PROMPT = `You are a skill file reviewer. You analyze SKILL.md files (configuration files that teach AI coding assistants new capabilities) and provide a structured technical review.

Evaluate the skill across three dimensions:

1. **Validation** (0-100): Is the file well-structured? Does it have valid frontmatter (name, description, type fields)? Is the markdown well-formed? Are there any syntax issues? Does it stay within reasonable length?

2. **Discovery** (0-100): How good is the description? Will it trigger accurately — not too broad, not too narrow? Is it specific enough to distinguish from other skills? Does it clearly communicate what the skill does?

3. **Implementation** (0-100): Are the instructions clear and actionable? Does the skill deliver on what the description promises? Are there concrete examples, edge cases handled, and good structure? Is it complete?

Also assess security risk as LOW, MEDIUM, or HIGH (does it instruct the agent to do anything risky like running arbitrary commands, accessing credentials, or making external requests without guardrails?).

You MUST respond with valid JSON in exactly this format:
{
  "validation": { "score": <0-100>, "reasoning": "<1-2 sentences>" },
  "discovery": { "score": <0-100>, "reasoning": "<1-2 sentences>" },
  "implementation": { "score": <0-100>, "reasoning": "<1-2 sentences>" },
  "finalScore": <0-100>,
  "securityRating": "LOW" | "MEDIUM" | "HIGH",
  "summary": "<2-3 paragraph technical review covering strengths, weaknesses, and specific issues found>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}

Be rigorous. Most skills should score between 40-80. Only exceptional skills get 90+. Be specific in reasoning — cite actual content from the skill file.`;

async function runTesslReviewFallback(
  skillContent: string
): Promise<TesslReview> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: FALLBACK_PROMPT,
    messages: [
      { role: "user", content: `Review this skill file:\n\n${skillContent}` },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let metrics: TesslMetrics = {
    validation: null,
    discovery: null,
    implementation: null,
    finalScore: null,
    securityRating: null,
  };

  let rawReview = text;

  try {
    const jsonMatch =
      text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
      text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      metrics.validation = parsed.validation?.score ?? null;
      metrics.discovery = parsed.discovery?.score ?? null;
      metrics.implementation = parsed.implementation?.score ?? null;
      metrics.finalScore = parsed.finalScore ?? null;
      metrics.securityRating = parsed.securityRating ?? null;

      const parts: string[] = [];
      if (parsed.summary) {
        parts.push("## Summary\n");
        parts.push(parsed.summary);
      }

      parts.push("\n## Dimension Breakdown\n");
      parts.push("| Dimension | Reasoning | Score |");
      parts.push("|-----------|-----------|-------|");
      if (parsed.validation?.reasoning)
        parts.push(`| **Validation** | ${parsed.validation.reasoning} | ${parsed.validation.score}/100 |`);
      if (parsed.discovery?.reasoning)
        parts.push(`| **Discovery** | ${parsed.discovery.reasoning} | ${parsed.discovery.score}/100 |`);
      if (parsed.implementation?.reasoning)
        parts.push(`| **Implementation** | ${parsed.implementation.reasoning} | ${parsed.implementation.score}/100 |`);

      if (parsed.finalScore != null)
        parts.push(`\n**Final Score: ${parsed.finalScore}/100**`);
      if (parsed.securityRating)
        parts.push(`\n**Security Rating: ${parsed.securityRating}**`);
      if (parsed.suggestions?.length) {
        parts.push("\n## Suggestions\n");
        for (const s of parsed.suggestions) parts.push(`- ${s}`);
      }

      rawReview = parts.join("\n");
    }
  } catch {
    rawReview = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  }

  if (metrics.finalScore === null) {
    const scores = [metrics.validation, metrics.discovery, metrics.implementation].filter(
      (s): s is number => s !== null
    );
    if (scores.length > 0)
      metrics.finalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return { raw: rawReview, metrics };
}

// ─── Public API ───

export async function runTesslReview(
  githubUrl: string,
  skillContent?: string
): Promise<TesslReview> {
  // Try real Tessl microservice first
  try {
    return await runTesslReviewViaService(githubUrl);
  } catch (err) {
    console.warn("Tessl microservice unavailable, using fallback:", (err as Error).message);
  }

  // Fallback to Claude API review
  if (!skillContent) {
    throw new Error("Tessl review service unavailable and no skill content provided for fallback.");
  }
  return runTesslReviewFallback(skillContent);
}
