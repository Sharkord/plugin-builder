import { zManifest, type TManifest } from "../statics";
import fs from "fs/promises";

type TPatchManifestOptions = {
  manifest: TManifest;
  manifestPath: string;
  packageJsonPath: string;
  sdkVersion: number;
};

const patchManifest = async (options: TPatchManifestOptions) => {
  const { manifest, sdkVersion, manifestPath } = options;

  const packageJson = await Bun.file(options.packageJsonPath).json();
  const newManifest = structuredClone(manifest);

  newManifest.sdkVersion = sdkVersion;
  newManifest.version = packageJson.version;

  const validatedManifest = zManifest.parse(newManifest);

  await fs.writeFile(
    manifestPath,
    JSON.stringify(validatedManifest, null, 2),
    "utf-8",
  );

  return validatedManifest;
};

export { patchManifest };
