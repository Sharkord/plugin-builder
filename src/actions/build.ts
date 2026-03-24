import { getValidManifest } from "../helpers/get-valid-manifest";
import fs from "fs/promises";
import { bundle } from "../helpers/bundle";
import path from "path";
import { patchManifest } from "../helpers/patch-manifest";
import { archive } from "../helpers/archive";
import type { TManifest, TPluginVersion } from "../statics";
import { sha256 } from "../helpers/sha256";
import { clearDir } from "../helpers/clear-dir";

type TBuildContext = {
  pluginRootDir: string;
  distDir: string;
  outDir: string;
  manifest: TManifest;
};

type TBuildOptions = {
  pluginRootDir?: string;
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

const build = async (options: TBuildOptions = {}) => {
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

  await patchManifest({
    manifest,
    sdkVersion: options.sdkVersion ?? 1,
    manifestPath,
    packageJsonPath,
  });

  console.log(`Copying manifest to "${outDir}" directory...`);

  await fs.copyFile(manifestPath, path.join(outDir, "manifest.json"));

  const tarName = `${manifest.id}-${manifest.version}`;

  console.log(`Creating tarball "${tarName}.tar"...`);

  const archivePath = await archive({
    targetDir: distDir,
    archiveDir: distDir,
    tarName,
  });

  console.log("Creating version file...");

  const version: TPluginVersion = {
    version: manifest.version,
    downloadUrl: "ADD_DOWNLOAD_URL_HERE",
    checksum: await sha256(archivePath),
    sdkVersion: manifest.sdkVersion,
    size: (await fs.stat(archivePath)).size,
  };

  const versionPath = path.resolve(
    path.join(distDir, `${manifest.version}.json`),
  );

  await fs.writeFile(versionPath, JSON.stringify(version, null, 2));

  console.log(
    `Build complete!\nTarball: ${archivePath}\nVersion file: ${versionPath}\nRemember to update the downloadUrl in the version file before publishing!`,
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
    versionPath,
    outDir,
  };
};

export { build };
export type { TBuildContext, TBuildOptions };
