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

// POST /review — run tessl skill review --json <url>
app.post("/review", auth, (req, res) => {
  const { url } = req.body;

  if (!url || !isValidGithubUrl(url)) {
    return res
      .status(400)
      .json({ error: "Invalid or missing GitHub URL." });
  }

  // Spawn tessl CLI — pass URL as argument (never interpolated into shell)
  const child = spawn("tessl", ["skill", "review", "--json", url], {
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
