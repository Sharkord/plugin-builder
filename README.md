# plugin-builder

Builds Sharkord plugins, publishes a GitHub release, and opens a PR on [Sharkord/plugins](https://github.com/Sharkord/plugins).

```ts
import { publish } from "@sharkord/plugin-builder";

await publish(); // needs GITHUB_TOKEN with `repo` scope
```

`publish()` does: build → GitHub release (tarball + version file) → PR to the registry.
The PR comes from a fork of the registry under the token's user, adding `plugins/<id>/versions/<version>.json` and creating/syncing `plugins/<id>/plugin.json` (screenshots, tags, categories and verified are kept as-is in the registry).

Options: `repo` (owner/name, defaults to the `origin` remote), `sdkVersion`, `pluginRootDir`, `githubToken`, `pr: false` to skip the PR.
