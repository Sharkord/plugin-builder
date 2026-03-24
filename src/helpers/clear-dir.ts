import fs from "fs/promises";

const clearDir = async (dirPath: string) => {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
};

export { clearDir };
