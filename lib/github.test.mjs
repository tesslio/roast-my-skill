import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import {
  fetchFileFromGitHub, fetchSkillFromGitHub, findSkillFiles, isGitHubUrl, parseGitHubUrl,
} from './github.ts';

afterEach(() => mock.restoreAll());

test('repository URLs ignore UI query strings and fragments', () => {
  const url = 'https://github.com/owner/repo?tab=readme-ov-file#readme';
  assert.equal(isGitHubUrl(url), true);
  assert.deepEqual(parseGitHubUrl(url), {
    owner: 'owner', repo: 'repo', branch: undefined, path: undefined,
  });
});

test('skill discovery uses the actual default branch', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === 'https://api.github.com/repos/owner/repo') {
      return Response.json({ default_branch: 'develop' });
    }
    if (url === 'https://api.github.com/repos/owner/repo/git/trees/develop?recursive=1') {
      return Response.json({ tree: [{ type: 'blob', path: 'skills/example/SKILL.md' }] });
    }
    return new Response('', { status: 404 });
  });
  assert.deepEqual(await findSkillFiles('owner', 'repo'), [{
    path: 'skills/example/SKILL.md',
    url: 'https://github.com/owner/repo/blob/develop/skills/example/SKILL.md',
  }]);
});

test('GitHub API failures are reported instead of claiming no skills exist', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(findSkillFiles('owner', 'repo'), /503/);
});

test('raw file requests encode special filename characters', async () => {
  const urls = [];
  mock.method(globalThis, 'fetch', async (url) => {
    urls.push(url);
    return new Response('# Skill');
  });
  assert.equal(await fetchFileFromGitHub('owner', 'repo', 'main', 'skills/C# Basics/SKILL.md'), '# Skill');
  assert.deepEqual(urls, ['https://raw.githubusercontent.com/owner/repo/main/skills/C%23%20Basics/SKILL.md']);
});

test('a single discovered skill keeps a default branch containing a slash', async () => {
  mock.method(globalThis, 'fetch', async (url) => {
    if (url === 'https://api.github.com/repos/owner/repo') {
      return Response.json({ default_branch: 'release/current' });
    }
    if (url === 'https://api.github.com/repos/owner/repo/git/trees/release%2Fcurrent?recursive=1') {
      return Response.json({ tree: [{ type: 'blob', path: 'SKILL.md' }] });
    }
    if (url === 'https://raw.githubusercontent.com/owner/repo/release%2Fcurrent/SKILL.md') {
      return new Response('# Skill');
    }
    return new Response('', { status: 404 });
  });
  assert.deepEqual(await fetchSkillFromGitHub('https://github.com/owner/repo'), {
    content: '# Skill', skillFiles: null,
  });
});

test('rejects non-GitHub URLs and retains ordinary direct file links', () => {
  assert.equal(parseGitHubUrl('https://example.test/owner/repo'), null);
  assert.deepEqual(parseGitHubUrl('https://github.com/owner/repo/blob/main/skills/example/SKILL.md'), {
    owner: 'owner', repo: 'repo', branch: 'main', path: 'skills/example/SKILL.md',
  });
});
