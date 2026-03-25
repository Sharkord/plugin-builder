import { getValidManifest } from "../helpers/get-valid-manifest";
import fs from "fs/promises";
import { bundle } from "../helpers/bundle";
import path from "path";
import { patchManifest } from "../helpers/patch-manifest";
import { archive } from "../helpers/archive";
import type { TManifest, TPluginVersion } from "../statics";
import { clearDir } from "../helpers/clear-dir";
import {
  createPluginVersion,
  getPluginVersionPath,
  writePluginVersionFile,
} from "../helpers/version-file";

const DEFAULT_DOWNLOAD_URL = "ADD_DOWNLOAD_URL_HERE";

type TBuildContext = {
  pluginRootDir: string;
  distDir: string;
  outDir: string;
  manifest: TManifest;
};

type TBuildOptions = {
  pluginRootDir?: string;
  downloadUrl?: string;
  sdkVersion?: number;
  onAfterBundle?: (context: {
    outDir: string;
    manifest: TManifest;
  }) => void | Promise<void>;
  onFinish?: (context: {
    archivePath: string;
    versionPath: string;
    outDir: string;
  }) => void | Promise<void>;
};

type TBuildResult = {
  archivePath: string;
  manifest: TManifest;
  outDir: string;
  version: TPluginVersion;
  versionPath: string;
};

const build = async (options: TBuildOptions = {}): Promise<TBuildResult> => {
  const pluginRootDir = options.pluginRootDir ?? process.cwd();
  const manifestPath = path.resolve(path.join(pluginRootDir, "manifest.json"));
  const packageJsonPath = path.resolve(
    path.join(pluginRootDir, "package.json"),
  );
  const distDir = path.join(pluginRootDir, "dist");

  const manifest = await getValidManifest(manifestPath);
  const outDir = path.join(distDir, manifest.id);

  console.log(`Cleaning "${outDir}" directory...`);

  await clearDir(distDir);

  console.log("Bundling plugin...");

  await bundle({ outDir, pluginRootDir });

  if (options.onAfterBundle) {
    console.log("Running post-bundle hook...");

    await options.onAfterBundle({
      outDir,
      manifest,
    });
  }

  console.log("Patching manifest with correct sdkVersion...");

  const patchedManifest = await patchManifest({
    manifest,
    sdkVersion: options.sdkVersion ?? 1,
    manifestPath,
    packageJsonPath,
  });

  console.log(`Copying manifest to "${outDir}" directory...`);

  await fs.copyFile(manifestPath, path.join(outDir, "manifest.json"));

  const tarName = `${patchedManifest.id}-${patchedManifest.version}`;

  console.log(`Creating tarball "${tarName}.tar"...`);

  const archivePath = await archive({
    targetDir: distDir,
    archiveDir: distDir,
    tarName,
  });

  console.log("Creating version file...");

  const version = await createPluginVersion({
    archivePath,
    downloadUrl: options.downloadUrl ?? DEFAULT_DOWNLOAD_URL,
    manifest: patchedManifest,
  });

  const versionPath = getPluginVersionPath(distDir, version.version);

  await writePluginVersionFile({ version, versionPath });

  console.log(
    options.downloadUrl
      ? `Build complete!\nTarball: ${archivePath}\nVersion file: ${versionPath}`
      : `Build complete!\nTarball: ${archivePath}\nVersion file: ${versionPath}\nRemember to update the downloadUrl in the version file before publishing!`,
  );

  if (options.onFinish) {
    console.log("Running post-build hook...");

    await options.onFinish({
      archivePath,
      versionPath,
      outDir,
    });
  }

  return {
    archivePath,
    manifest: patchedManifest,
    versionPath,
    outDir,
    version,
  };
};

export { build };
export type { TBuildContext, TBuildOptions, TBuildResult };
