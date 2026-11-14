const GITHUB_URL_PATTERN =
  /^\/([^/]+)\/([^/]+)(?:\/(?:blob|tree)\/([^/]+)\/(.+))?$/;

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

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
  try {
    const parsed = new URL(url.trim());
    if (parsed.origin !== "https://github.com" || parsed.username || parsed.password) return null;
    const match = parsed.pathname.replace(/\/$/, "").match(GITHUB_URL_PATTERN);
    if (!match) return null;
    const [, owner, repo, branch, path] = match;
    return {
      owner: decodeURIComponent(owner),
      repo: decodeURIComponent(repo),
      branch: branch ? decodeURIComponent(branch) : undefined,
      path: path ? decodeURIComponent(path) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Find all SKILL.md files in a GitHub repo using the Trees API.
 * Returns the list of file paths.
 */
export async function findSkillFiles(
  owner: string,
  repo: string
): Promise<SkillFileEntry[]> {
  const repositoryUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repositoryResponse = await fetch(repositoryUrl, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!repositoryResponse.ok) {
    throw new Error(`Failed to read GitHub repository (HTTP ${repositoryResponse.status}).`);
  }
  const repository = await repositoryResponse.json();
  const branch = repository.default_branch;
  if (typeof branch !== "string" || !branch) {
    throw new Error("GitHub repository has no default branch.");
  }
  const treeUrl = `${repositoryUrl}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const res = await fetch(treeUrl, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to list GitHub repository files (HTTP ${res.status}).`);
  }

  const data = await res.json();
  return (data.tree ?? [])
    .filter(
      (item: { path: string; type: string }) =>
        item.type === "blob" && /(?:^|\/)(SKILL|skill)\.md$/i.test(item.path)
    )
    .map((item: { path: string }) => ({
      path: item.path,
      url: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/blob/${encodeURIComponent(branch)}/${encodePath(item.path)}`,
    }));
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
  const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodePath(path)}`;
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
      "No SKILL.md files found on this repository's default branch."
    );
  }

  if (skillFiles.length === 1) {
    // Only one — fetch it directly
    const file = skillFiles[0];
    const fileUrl = parseGitHubUrl(file.url)!;
    const content = await fetchFileFromGitHub(owner, repo, fileUrl.branch!, fileUrl.path!);
    return { content, skillFiles: null };
  }

  // Multiple — let the user pick
  return { content: null, skillFiles };
}

export function isGitHubUrl(input: string): boolean {
  return parseGitHubUrl(input) !== null;
}
