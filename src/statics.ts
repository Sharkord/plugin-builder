import z from "zod";

const zPluginId = z
  .string()
  .min(1, "Plugin ID is required")
  .regex(
    /^[a-z0-9-]+$/,
    "Plugin ID must contain only lowercase letters, numbers, and dashes",
  );

// this type should match with the one in the plugin registry repo
export const zPluginManifest = z.object({
  id: zPluginId,
  name: z.string().min(1, "Plugin name is required"),
  author: z.string().min(1, "Plugin author is required"),
  description: z.string().min(1, "Plugin description is required"),
  homepage: z.url().optional(),
  logo: z.url().optional(),
  sdkVersion: z.number().int().nonnegative(),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-.]+)?$/, "Invalid version format"),
});

// this type should match with the one in sharkord
const zManifest = z.object({
  id: zPluginId,
  name: z.string(),
  author: z.string(),
  description: z.string(),
  homepage: z.url().optional(),
  logo: z.url().optional(),
  sdkVersion: z.number(),
  version: z.string(),
});

// this type should match with the one in the plugin registry repo
const zPluginVersion = z.object({
  version: z.string(),
  downloadUrl: z.url(),
  checksum: z.string(),
  sdkVersion: z.number(),
  size: z.number(),
  timestamp: z.number().int().nonnegative(),
});

type TManifest = z.infer<typeof zManifest>;
type TPluginVersion = z.infer<typeof zPluginVersion>;

export { zManifest, zPluginVersion };
export type { TManifest, TPluginVersion };
