import { DEPLOYMENT_TARGETS } from './config';
import { jsonFetch } from './http';

export async function getGithubOverview() {
  const { githubOwner, githubRepo, githubBranch, expectedCommit } = DEPLOYMENT_TARGETS;
  const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const res = await jsonFetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/commits/${githubBranch}`, { headers });
  if (!res.ok) return { status: 'error', message: 'Unable to read GitHub commit.', detail: res.status };
  const sha = res.body?.sha || '';
  return {
    status: sha.startsWith(expectedCommit) ? 'ok' : 'mismatch',
    repository: `${githubOwner}/${githubRepo}`,
    branch: githubBranch,
    latestCommit: sha.slice(0, 7),
    expectedCommit,
    message: sha.startsWith(expectedCommit) ? 'GitHub branch matches expected commit.' : 'GitHub branch does not match the expected commit.',
  };
}
