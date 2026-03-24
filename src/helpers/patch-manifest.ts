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

  try {
    zManifest.parse(newManifest);
  } catch (error) {
    console.error("Error validating patched manifest:", error);
  }

  await fs.writeFile(
    manifestPath,
    JSON.stringify(newManifest, null, 2),
    "utf-8",
  );
};

export { patchManifest };
