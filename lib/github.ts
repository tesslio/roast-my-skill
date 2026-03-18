const GITHUB_URL_PATTERN =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/(?:blob|tree)\/([^/]+)\/(.+))?$/;

export interface SkillFileEntry {
  path: string;
  url: string;
}

/**
 * Parse a GitHub URL into its components. Returns null if invalid.
 */
export function parseGitHubUrl(
  url: string
): { owner: string; repo: string; branch?: string; path?: string } | null {
  const trimmed = url.trim().replace(/\/$/, "");
  const match = trimmed.match(GITHUB_URL_PATTERN);
  if (!match) return null;
  const [, owner, repo, branch, path] = match;
  return { owner, repo, branch: branch || undefined, path: path || undefined };
}

/**
 * Find all SKILL.md files in a GitHub repo using the Trees API.
 * Returns the list of file paths.
 */
export async function findSkillFiles(
  owner: string,
  repo: string
): Promise<SkillFileEntry[]> {
  for (const branch of ["main", "master"]) {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const res = await fetch(treeUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) continue;

    const data = await res.json();
    const skillFiles: SkillFileEntry[] = (data.tree ?? [])
      .filter(
        (item: { path: string; type: string }) =>
          item.type === "blob" && /(?:^|\/)(SKILL|skill)\.md$/i.test(item.path)
      )
      .map((item: { path: string }) => ({
        path: item.path,
        url: `https://github.com/${owner}/${repo}/blob/${branch}/${item.path}`,
      }));

    if (skillFiles.length > 0) return skillFiles;
  }

  return [];
}

/**
 * Fetch a specific file from GitHub by raw URL components.
 */
export async function fetchFileFromGitHub(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const res = await fetch(rawUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch file from GitHub (HTTP ${res.status}).`);
  }
  return res.text();
}

/**
 * Convert a GitHub URL to a raw content URL and fetch the Skill.md content.
 * Supports:
 *   - https://github.com/owner/repo/blob/branch/path/to/SKILL.md
 *   - https://github.com/owner/repo (looks for SKILL.md at root of default branch)
 *
 * Returns { content, skillFiles } — if the repo has multiple SKILL.md files
 * and no specific file was targeted, content will be null and skillFiles will
 * contain the list for the user to pick from.
 */
export async function fetchSkillFromGitHub(
  url: string
): Promise<
  | { content: string; skillFiles: null }
  | { content: null; skillFiles: SkillFileEntry[] }
> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo or https://github.com/owner/repo/blob/branch/path/SKILL.md"
    );
  }

  const { owner, repo, branch, path } = parsed;

  if (path) {
    // Direct file link
    const content = await fetchFileFromGitHub(owner, repo, branch!, path);
    return { content, skillFiles: null };
  }

  // Repo root — search for SKILL.md files
  const skillFiles = await findSkillFiles(owner, repo);

  if (skillFiles.length === 0) {
    throw new Error(
      "No SKILL.md files found in this repository (searched main and master branches)."
    );
  }

  if (skillFiles.length === 1) {
    // Only one — fetch it directly
    const file = skillFiles[0];
    const branchMatch = file.url.match(/\/blob\/([^/]+)\//);
    const fileBranch = branchMatch?.[1] ?? "main";
    const content = await fetchFileFromGitHub(owner, repo, fileBranch, file.path);
    return { content, skillFiles: null };
  }

  // Multiple — let the user pick
  return { content: null, skillFiles };
}

export function isGitHubUrl(input: string): boolean {
  return GITHUB_URL_PATTERN.test(input.trim().replace(/\/$/, ""));
}
