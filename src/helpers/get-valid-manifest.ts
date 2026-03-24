import { zManifest, type TManifest } from "../statics";
import fs from "fs/promises";

const getValidManifest = async (manifestPath: string): Promise<TManifest> => {
  if (!(await fs.exists(manifestPath))) {
    console.error("manifest.json not found in the current directory.");
    process.exit(1);
  }

  const rawManifest = await Bun.file(manifestPath).json();

  const manifest = zManifest.parse(rawManifest);

  const hasUppercase = /[A-Z]/.test(manifest.id);

  if (hasUppercase) {
    console.error(
      "Plugin ID must be lowercase. Please update the 'id' field in your manifest.json.",
    );

    process.exit(1);
  }

  return manifest;
};

export { getValidManifest };
