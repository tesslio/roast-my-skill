const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:blob|tree)\/([^/]+)\/(.+))?$/;

/**
 * Convert a GitHub URL to a raw content URL and fetch the Skill.md content.
 * Supports:
 *   - https://github.com/owner/repo/blob/branch/path/to/SKILL.md
 *   - https://github.com/owner/repo (looks for SKILL.md at root of default branch)
 */
export async function fetchSkillFromGitHub(url: string): Promise<string> {
  const trimmed = url.trim().replace(/\/$/, "");
  const match = trimmed.match(GITHUB_URL_PATTERN);
  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo/blob/branch/path/SKILL.md"
    );
  }

  const [, owner, repo, branch, path] = match;

  let rawUrl: string;
  if (path) {
    // Direct file link
    rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  } else {
    // Repo root — try SKILL.md on main, then master
    for (const defaultBranch of ["main", "master"]) {
      const tryUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/SKILL.md`;
      const res = await fetch(tryUrl);
      if (res.ok) {
        return res.text();
      }
    }
    throw new Error(
      "Could not find SKILL.md at the root of this repository (tried main and master branches)."
    );
  }

  const res = await fetch(rawUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch file from GitHub (HTTP ${res.status}).`);
  }
  return res.text();
}

export function isGitHubUrl(input: string): boolean {
  return GITHUB_URL_PATTERN.test(input.trim().replace(/\/$/, ""));
}
