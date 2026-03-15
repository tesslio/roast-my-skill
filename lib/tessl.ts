import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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

const REVIEW_SYSTEM_PROMPT = `You are a skill file reviewer. You analyze SKILL.md files (configuration files that teach AI coding assistants new capabilities) and provide a structured technical review.

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

export async function runTesslReview(
  skillContent: string
): Promise<TesslReview> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: REVIEW_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Review this skill file:\n\n${skillContent}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response
  let metrics: TesslMetrics = {
    validation: null,
    discovery: null,
    implementation: null,
    finalScore: null,
    securityRating: null,
  };

  let rawReview = text;

  try {
    // Extract JSON from response (might be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      metrics.validation = parsed.validation?.score ?? null;
      metrics.discovery = parsed.discovery?.score ?? null;
      metrics.implementation = parsed.implementation?.score ?? null;
      metrics.finalScore = parsed.finalScore ?? null;
      metrics.securityRating = parsed.securityRating ?? null;

      // Build a readable review from the structured data
      const parts: string[] = [];

      if (parsed.summary) {
        parts.push(parsed.summary);
      }

      parts.push("\n\n### Dimension Breakdown\n");
      parts.push("| Dimension | Reasoning | Score |");
      parts.push("|-----------|-----------|-------|");

      if (parsed.validation) {
        parts.push(
          `| **Validation** | ${parsed.validation.reasoning} | ${parsed.validation.score}/100 |`
        );
      }
      if (parsed.discovery) {
        parts.push(
          `| **Discovery** | ${parsed.discovery.reasoning} | ${parsed.discovery.score}/100 |`
        );
      }
      if (parsed.implementation) {
        parts.push(
          `| **Implementation** | ${parsed.implementation.reasoning} | ${parsed.implementation.score}/100 |`
        );
      }

      if (parsed.finalScore) {
        parts.push(`\n**Final Score: ${parsed.finalScore}/100**`);
      }

      if (parsed.securityRating) {
        parts.push(`\n**Security Rating: ${parsed.securityRating}**`);
      }

      if (parsed.suggestions?.length) {
        parts.push("\n### Suggestions\n");
        for (const s of parsed.suggestions) {
          parts.push(`- ${s}`);
        }
      }

      rawReview = parts.join("\n");
    }
  } catch {
    // If JSON parsing fails, use raw text as the review
  }

  // Derive final score if not present
  if (metrics.finalScore === null) {
    const scores = [
      metrics.validation,
      metrics.discovery,
      metrics.implementation,
    ].filter((s): s is number => s !== null);
    if (scores.length > 0) {
      metrics.finalScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
    }
  }

  return { raw: rawReview, metrics };
}
