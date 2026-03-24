import { parseArgs } from "util";
import { build } from "./actions/build";

const printUsage = () => {
  console.log("Usage: sharkord-plugin-cli <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  build    Build the plugin in the current directory");
  console.log("");
  console.log("Options:");
  console.log("  --path <dir>    Plugin root directory (defaults to current directory)");
  console.log("  -h, --help      Show help");
};

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    path: {
      type: "string",
    },
  },
  strict: true,
  allowPositionals: true,
});

const command = positionals[0];

if (values.help || !command) {
  printUsage();
  process.exit(values.help ? 0 : 1);
}

switch (command) {
  case "build":
    await build({ pluginRootDir: values.path ?? process.cwd() });
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
