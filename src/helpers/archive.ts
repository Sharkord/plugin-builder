import path from "path";

type TArchiveOptions = {
  targetDir: string;
  archiveDir: string;
  tarName: string;
};

const archive = async ({ targetDir, archiveDir, tarName }: TArchiveOptions) => {
  const glob = new Bun.Glob(`${targetDir}/**/*`);

  const files: Record<string, ArrayBuffer> = {};

  for await (const filePath of glob.scan(".")) {
    const relativePath = path.relative(targetDir, filePath);

    files[relativePath] = await Bun.file(filePath).arrayBuffer();
  }

  console.log(`Archiving ${Object.keys(files).length} files...`);

  const archive = new Bun.Archive(files, {
    compress: "gzip",
  });

  const archivePath = path.join(archiveDir, `${tarName}.tar.gz`);

  await Bun.write(archivePath, archive);

  return archivePath;
};

export { archive };
