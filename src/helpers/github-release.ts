import { Octokit } from "@octokit/rest";
import fs from "fs/promises";

type TGitHubRelease = {
  downloadUrl: string;
  id: number;
};

type TGitHubReleaseAsset = {
  browser_download_url: string;
  id: number;
  name: string;
};

type TCreateGitHubReleaseOptions = {
  name: string;
  repository: string;
  tag: string;
  token: string;
};

type TUploadReleaseAssetOptions = {
  assetName: string;
  assetPath: string;
  contentType?: string;
  releaseId: number;
  repository: string;
  token: string;
};

const createOctokit = (token: string) =>
  new Octokit({
    auth: token,
    userAgent: "@sharkord/plugin-builder",
  });

const splitRepository = (repository: string) => {
  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error(
      `Invalid GitHub repository "${repository}". Expected owner/repo.`,
    );
  }

  return { owner, repo };
};

const assertReleaseDoesNotExist = async (
  repository: string,
  tag: string,
  token: string,
) => {
  const octokit = createOctokit(token);
  const { owner, repo } = splitRepository(repository);

  try {
    await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag,
    });

    throw new Error(
      `A GitHub release already exists for tag ${tag} in ${repository}.`,
    );
  } catch (error) {
    if (!(error instanceof Error) || !("status" in error)) {
      throw error;
    }

    if (error.status !== 404) {
      throw new Error(
        `Unable to check whether release ${tag} already exists: ${error.message}`,
      );
    }
  }

  try {
    await octokit.rest.git.getRef({
      owner,
      ref: `tags/${tag}`,
      repo,
    });

    throw new Error(`A git tag named ${tag} already exists in ${repository}.`);
  } catch (error) {
    if (!(error instanceof Error) || !("status" in error)) {
      throw error;
    }

    if (error.status !== 404) {
      throw new Error(
        `Unable to check whether tag ${tag} already exists: ${error.message}`,
      );
    }
  }
};

const createGitHubRelease = async ({
  name,
  repository,
  tag,
  token,
}: TCreateGitHubReleaseOptions): Promise<TGitHubRelease> => {
  await assertReleaseDoesNotExist(repository, tag, token);
  const octokit = createOctokit(token);
  const { owner, repo } = splitRepository(repository);

  try {
    const response = await octokit.rest.repos.createRelease({
      owner,
      repo,
      draft: false,
      generate_release_notes: false,
      name,
      prerelease: false,
      tag_name: tag,
    });

    return {
      downloadUrl: response.data.html_url,
      id: response.data.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Unable to create GitHub release ${tag}: ${error.message}`,
      );
    }

    throw error;
  }
};

const uploadGitHubReleaseAsset = async ({
  assetName,
  assetPath,
  contentType,
  releaseId,
  repository,
  token,
}: TUploadReleaseAssetOptions): Promise<TGitHubReleaseAsset> => {
  const octokit = createOctokit(token);
  const { owner, repo } = splitRepository(repository);
  const data = await fs.readFile(assetPath);
  const assetData = data as unknown as string;

  try {
    const response = await octokit.rest.repos.uploadReleaseAsset({
      data: assetData,
      headers: {
        "content-length": data.byteLength,
        "content-type": contentType ?? "application/octet-stream",
      },
      name: assetName,
      owner,
      release_id: releaseId,
      repo,
    });

    return {
      browser_download_url: response.data.browser_download_url,
      id: response.data.id,
      name: response.data.name,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Unable to upload release asset ${assetName}: ${error.message}`,
      );
    }

    throw error;
  }
};

export { createGitHubRelease, uploadGitHubReleaseAsset };
