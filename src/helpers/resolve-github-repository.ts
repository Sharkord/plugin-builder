import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const normalizeGitHubRepository = (value: string) => {
  const trimmedValue = value.trim();

  const directMatch = trimmedValue.match(
    /^(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+)$/,
  );

  if (directMatch?.groups) {
    return `${directMatch.groups.owner}/${directMatch.groups.repo}`;
  }

  const remoteMatch = trimmedValue.match(
    /github\.com[:/](?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+?)(?:\.git)?$/,
  );

  if (remoteMatch?.groups) {
    return `${remoteMatch.groups.owner}/${remoteMatch.groups.repo}`;
  }

  throw new Error(
    `Unable to resolve a GitHub repository from "${value}". Expected owner/repo or a GitHub remote URL.`,
  );
};

const resolveGitHubRepository = async (
  pluginRootDir: string,
  repo?: string,
) => {
  if (repo) {
    return normalizeGitHubRepository(repo);
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["remote", "get-url", "origin"],
      {
        cwd: pluginRootDir,
      },
    );

    return normalizeGitHubRepository(stdout);
  } catch {
    throw new Error(
      "Unable to infer the GitHub repository from git remote 'origin'. Use --repo owner/name or configure an origin remote.",
    );
  }
};

export { resolveGitHubRepository };