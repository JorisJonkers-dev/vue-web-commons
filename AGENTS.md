# Agents

Guidance for any coding agent working in this repository.

The agent contract is [CLAUDE.md](CLAUDE.md); the [estate contract](https://github.com/JorisJonkers-dev/workspace/blob/main/CLAUDE.md) applies too.

## Build and test

```sh
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run package:check
```

These are the scripts in `package.json`; `.npmrc` needs NODE_AUTH_TOKEN for GitHub Packages.
