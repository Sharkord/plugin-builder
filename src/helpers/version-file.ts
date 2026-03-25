import fs from "fs/promises";
import path from "path";
import type { TManifest, TPluginVersion } from "../statics";
import { sha256 } from "./sha256";

type TCreatePluginVersionOptions = {
  archivePath: string;
  downloadUrl: string;
  manifest: TManifest;
};

type TWritePluginVersionFileOptions = {
  version: TPluginVersion;
  versionPath: string;
};

const getPluginVersionPath = (distDir: string, version: string) =>
  path.resolve(path.join(distDir, `${version}.json`));

const createPluginVersion = async ({
  archivePath,
  downloadUrl,
  manifest,
}: TCreatePluginVersionOptions): Promise<TPluginVersion> => ({
  version: manifest.version,
  downloadUrl,
  checksum: await sha256(archivePath),
  sdkVersion: manifest.sdkVersion,
  size: (await fs.stat(archivePath)).size,
});

const writePluginVersionFile = async ({
  version,
  versionPath,
}: TWritePluginVersionFileOptions) => {
  await fs.writeFile(versionPath, JSON.stringify(version, null, 2), "utf-8");
};

export { createPluginVersion, getPluginVersionPath, writePluginVersionFile };