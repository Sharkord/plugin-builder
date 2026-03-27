import path from "path";
import { build, type TBuildResult } from "./build";
import {
  createGitHubRelease,
  uploadGitHubReleaseAsset,
} from "../helpers/github-release";
import { resolveGitHubRepository } from "../helpers/resolve-github-repository";
import { writePluginVersionFile } from "../helpers/version-file";

type TPublishOptions = {
  githubToken?: string;
  pluginRootDir?: string;
  repo?: string;
  sdkVersion?: number;
};

type TPublishResult = TBuildResult & {
  downloadUrl: string;
  releaseUrl: string;
  repository: string;
  tag: string;
};

const publish = async (
  options: TPublishOptions = {},
): Promise<TPublishResult> => {
  const pluginRootDir = options.pluginRootDir ?? process.cwd();
  const token = options.githubToken ?? process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "Missing GITHUB_TOKEN. Set it in the environment or pass githubToken programmatically.",
    );
  }

  const repository = await resolveGitHubRepository(pluginRootDir, options.repo);

  console.log(`Publishing to GitHub repository ${repository}...`);

  const buildResult = await build({
    pluginRootDir,
    sdkVersion: options.sdkVersion,
  });

  const tag = `v${buildResult.version.version}`;

  console.log(`Creating GitHub release ${tag}...`);

  const release = await createGitHubRelease({
    name: tag,
    repository,
    tag,
    token,
  });

  const archiveAssetName = path.basename(buildResult.archivePath);

  console.log(`Uploading release asset ${archiveAssetName}...`);

  const archiveAsset = await uploadGitHubReleaseAsset({
    assetName: archiveAssetName,
    assetPath: buildResult.archivePath,
    contentType: "application/x-tar",
    releaseId: release.id,
    repository,
    token,
  });

  const version = {
    ...buildResult.version,
    downloadUrl: archiveAsset.browser_download_url,
  };

  await writePluginVersionFile({
    version,
    versionPath: buildResult.versionPath,
  });

  const versionAssetName = path.basename(buildResult.versionPath);

  console.log(`Uploading release asset ${versionAssetName}...`);

  await uploadGitHubReleaseAsset({
    assetName: versionAssetName,
    assetPath: buildResult.versionPath,
    contentType: "application/json",
    releaseId: release.id,
    repository,
    token,
  });

  console.log(
    `Publish complete!\nRelease: ${release.downloadUrl}\nDownload URL: ${archiveAsset.browser_download_url}\nVersion file: ${buildResult.versionPath}`,
  );

  return {
    ...buildResult,
    downloadUrl: archiveAsset.browser_download_url,
    releaseUrl: release.downloadUrl,
    repository,
    tag,
    version,
  };
};

export { publish };
export type { TPublishOptions, TPublishResult };
