import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is required");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Rate limit: 10 requests per minute
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: "Too many requests. Try again in a minute." },
  })
);

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || header !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Validate GitHub URL to prevent command injection
const GITHUB_URL_RE =
  /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/;

function isValidGithubUrl(url) {
  return typeof url === "string" && GITHUB_URL_RE.test(url) && url.length < 500;
}

/**
 * Parse a GitHub blob URL to extract repo root and skill name.
 * e.g. https://github.com/owner/repo/blob/main/path/to/skills/my-skill/SKILL.md
 *   → repoUrl: https://github.com/owner/repo
 *   → skillName: my-skill (parent directory of SKILL.md)
 *
 * For repo root URLs (no blob path), returns just repoUrl with no skillName.
 */
function parseGithubUrl(url) {
  const blobMatch = url.match(
    /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/blob\/[^/]+\/(.+)$/
  );

  if (blobMatch) {
    const repoUrl = blobMatch[1];
    const filePath = blobMatch[2];

    // Extract skill name from the parent directory of SKILL.md
    // e.g. "config/claude/skills/ab-test-setup/SKILL.md" → "ab-test-setup"
    const parts = filePath.replace(/\/SKILL\.md$/i, "").split("/");
    const skillName = parts[parts.length - 1];

    return { repoUrl, skillName };
  }

  // Tree URL (similar to blob)
  const treeMatch = url.match(
    /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/tree\/[^/]+\/(.+)$/
  );

  if (treeMatch) {
    const repoUrl = treeMatch[1];
    const dirPath = treeMatch[2];
    const parts = dirPath.split("/");
    const skillName = parts[parts.length - 1];
    return { repoUrl, skillName };
  }

  // Plain repo URL
  return { repoUrl: url, skillName: null };
}

// POST /review — run tessl skill review --json <url>
app.post("/review", auth, (req, res) => {
  const { url } = req.body;

  if (!url || !isValidGithubUrl(url)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing GitHub URL." });
  }

  const { repoUrl, skillName } = parseGithubUrl(url);

  // Build tessl CLI args
  const args = ["skill", "review", "--json"];
  if (skillName) {
    args.push("--skill", skillName);
  }
  args.push(repoUrl);

  console.log(`Running: tessl ${args.join(" ")}`);

  // Spawn tessl CLI — pass URL as argument (never interpolated into shell)
  const child = spawn("tessl", args, {
    timeout: 120_000,
    env: { ...process.env },
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`tessl exited with code ${code}: ${stderr}`);
      return res
        .status(502)
        .json({ error: "Tessl review failed.", details: stderr.slice(0, 500) });
    }

    // Extract JSON from stdout (tessl prints status lines before JSON)
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res
        .status(502)
        .json({ error: "Failed to parse tessl output." });
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      res.json(result);
    } catch {
      res.status(502).json({ error: "Invalid JSON from tessl." });
    }
  });

  child.on("error", (err) => {
    console.error("Failed to spawn tessl:", err);
    res.status(502).json({ error: "Failed to run tessl CLI." });
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Review microservice listening on port ${PORT}`);
});
