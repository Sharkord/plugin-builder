import type { BunPlugin } from "bun";
import fs from "fs/promises";
import path from "path";

const clientGlobals: BunPlugin = {
  name: "client-globals",
  setup(build) {
    // since the client bundle is meant to run in the host app's context
    // we need to make sure it uses the same React instance as Sharkord instead of bundling its own copy
    // we workaround this by rewriting bare react/react-dom imports to reference the host app's React globals, which Sharkord exposes on the window object
    const globals: Record<string, string> = {
      react: "window.__SHARKORD_REACT__",
      "react/jsx-runtime": "window.__SHARKORD_REACT_JSX__",
      "react/jsx-dev-runtime": "window.__SHARKORD_REACT_JSX_DEV__",
      "react-dom": "window.__SHARKORD_REACT_DOM__",
      "react-dom/client": "window.__SHARKORD_REACT_DOM_CLIENT__",
    };

    for (const [mod, global] of Object.entries(globals)) {
      build.onResolve(
        { filter: new RegExp(`^${mod.replace("/", "\\/")}$`) },
        () => ({
          path: mod,
          namespace: "client-global",
        }),
      );

      build.onLoad(
        {
          filter: new RegExp(`^${mod.replace("/", "\\/")}$`),
          namespace: "client-global",
        },
        () => ({
          contents: `module.exports = ${global};`,
          loader: "js",
        }),
      );
    }
  },
};

type TBundleOptions = {
  pluginRootDir: string;
  outDir: string;
};

const bundle = async ({ pluginRootDir, outDir }: TBundleOptions) => {
  const serverEntry = path.join(pluginRootDir, "src/server/index.ts");
  const clientEntry = path.join(pluginRootDir, "src/client/index.ts");

  if (!(await fs.exists(serverEntry))) {
    throw new Error(`Server entry point not found at "${serverEntry}"`);
  }

  if (!(await fs.exists(clientEntry))) {
    throw new Error(`Client entry point not found at "${clientEntry}"`);
  }

  await Promise.all([
    Bun.build({
      entrypoints: [serverEntry],
      outdir: `${outDir}/server`,
      target: "bun",
      minify: true,
      format: "esm",
      external: ["react", "react-dom"],
    }),

    Bun.build({
      entrypoints: [clientEntry],
      outdir: `${outDir}/client`,
      target: "browser",
      minify: true,
      format: "esm",
      plugins: [clientGlobals],
      define: {
        // forces production JSX transform so it uses jsx/jsxs from react/jsx-runtime
        // instead of jsxDEV from react/jsx-dev-runtime
        "process.env.NODE_ENV": '"production"',
      },
    }),
  ]);
};

export { bundle };
