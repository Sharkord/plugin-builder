import { Octokit } from "@octokit/rest";
import type { TManifest, TPluginVersion } from "../statics";

const REGISTRY = { owner: "Sharkord", repo: "plugins" };

type TOpenRegistryPrOptions = {
  manifest: TManifest;
  token: string;
  version: TPluginVersion;
};

const isNotFound = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error && error.status === 404;

const toJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

// keeps registry-owned fields (screenshots, verified, tags, categories) and syncs the rest from the manifest
const buildPluginInfo = (manifest: TManifest, existing: Record<string, unknown> | null) => ({
  id: manifest.id,
  name: manifest.name,
  description: manifest.description,
  author: manifest.author,
  logo: manifest.logo,
  homepage: manifest.homepage,
  screenshots: [],
  verified: false,
  tags: [],
  categories: [],
  ...existing,
  ...Object.fromEntries(
    Object.entries({
      name: manifest.name,
      description: manifest.description,
      author: manifest.author,
      logo: manifest.logo,
      homepage: manifest.homepage,
    }).filter(([, value]) => value !== undefined),
  ),
});

const openRegistryPr = async ({ manifest, token, version }: TOpenRegistryPrOptions) => {
  const octokit = new Octokit({ auth: token, userAgent: "@sharkord/plugin-builder" });
  const { data: me } = await octokit.rest.users.getAuthenticated();
  const { data: upstream } = await octokit.rest.repos.get(REGISTRY);
  const base = upstream.default_branch;

  const pluginDir = `plugins/${manifest.id}`;
  const infoPath = `${pluginDir}/plugin.json`;
  const versionPath = `${pluginDir}/versions/${version.version}.json`;

  const getFile = async (filePath: string) => {
    try {
      const { data } = await octokit.rest.repos.getContent({ ...REGISTRY, path: filePath, ref: base });

      return "content" in data && !Array.isArray(data)
        ? Buffer.from(data.content, "base64").toString("utf-8")
        : null;
    } catch (error) {
      if (isNotFound(error)) return null;

      throw error;
    }
  };

  if (await getFile(versionPath)) {
    throw new Error(`Registry already has ${versionPath}. Bump the version in package.json.`);
  }

  const existingRaw = await getFile(infoPath);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;
  const isNewPlugin = !existing;
  const info = toJson(buildPluginInfo(manifest, existing));

  const files = [{ path: versionPath, content: toJson(version) }];

  if (info !== existingRaw) files.push({ path: infoPath, content: info });

  // pushing straight to the registry only works for org members, everyone else goes through a fork
  const head = { owner: REGISTRY.owner, repo: REGISTRY.repo };

  if (me.login.toLowerCase() !== REGISTRY.owner.toLowerCase()) {
    await octokit.rest.repos.createFork(REGISTRY); // no-op when the fork already exists
    head.owner = me.login;

    // forks are created asynchronously
    for (let attempt = 0; ; attempt++) {
      try {
        await octokit.rest.repos.get(head);
        break;
      } catch (error) {
        if (!isNotFound(error) || attempt >= 15) throw error;

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  const { data: baseRef } = await octokit.rest.git.getRef({ ...REGISTRY, ref: `heads/${base}` });
  const { data: baseCommit } = await octokit.rest.git.getCommit({ ...REGISTRY, commit_sha: baseRef.object.sha });

  const title = `${isNewPlugin ? "Add" : "Update"} ${manifest.name} plugin (v${version.version})`;
  const branch = `${manifest.id}-${version.version}`;

  // the fork shares the upstream object database, so the upstream commit is usable as a parent
  const { data: tree } = await octokit.rest.git.createTree({
    ...head,
    base_tree: baseCommit.tree.sha,
    tree: files.map((file) => ({ path: file.path, mode: "100644", type: "blob", content: file.content })),
  });

  const { data: commit } = await octokit.rest.git.createCommit({
    ...head,
    message: title,
    parents: [baseRef.object.sha],
    tree: tree.sha,
  });

  await octokit.rest.git.createRef({ ...head, ref: `refs/heads/${branch}`, sha: commit.sha });

  const { data: pr } = await octokit.rest.pulls.create({
    ...REGISTRY,
    base,
    head: head.owner === REGISTRY.owner ? branch : `${head.owner}:${branch}`,
    title,
    body: `Automated by [@sharkord/plugin-builder](https://github.com/Sharkord/plugin-builder).\n\n- Plugin: \`${manifest.id}\`\n- Version: \`${version.version}\` (SDK ${version.sdkVersion})\n- Download: ${version.downloadUrl}\n- Checksum (sha256): \`${version.checksum}\``,
  });

  return pr.html_url;
};

export { openRegistryPr };
