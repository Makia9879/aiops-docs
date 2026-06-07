# AIOps Governance CLI

Executable workspace bootstrap for AIOps knowledge governance.

## Commands

- `install`: copy repo-local AIOps skills into runtime skill directories.
- `init`: initialize `.aiops/`, project skeleton, guides, hooks, and platform hook config.
- `setup`: run `install` and then `init`.

## Native Usage

After publishing, users should run the CLI through npm/npx:

```bash
npx -y @makia9879/aiops setup --yes --project cert-auth --products CA,RA,KMC,OCSP
```

`install` installs:

- AIOps skills.
- Fixed-version toolchain packages from `src/toolchain/versions.json`.

Default toolchain versions:

- `@colbymchenry/codegraph@0.9.9`
- `@understand-anything/skill@2.7.6`
- `@mindfoldhq/trellis@0.5.19`

Tool packages are installed under `~/.aiops/tools`, with shims under `~/.aiops/bin` when a package exposes a CLI bin.

Skip toolchain installation:

```bash
npx -y @makia9879/aiops install --with none
```

Install selected tools:

```bash
npx -y @makia9879/aiops install --with codegraph,trellis
```

## Docker Development Usage

Inside this repository, development and validation should avoid host `node`, `npm`, or `npx`. Use Docker:

```bash
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js setup --yes --with none --project cert-auth --products CA,RA,KMC,OCSP"
```

For validation with a temporary skills target:

```bash
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js install --skills-source /repo/skills --skills-target /tmp/aiops-skills"
```

## Options

- `--yes`: accept defaults.
- `--project <id>`: project id under `.aiops/projects/`.
- `--products <list>`: comma-separated product domains; empty means `core`.
- `--level <level>`: `low`, `medium`, `high`, or `xhigh`.
- `--language <lang>`: default `zh-CN`.
- `--skills-source <path>`: override skill source directory.
- `--skills-target <path>`: override runtime skill target directory.
- `--with <tools>`: `default`, `none`, or comma-separated `codegraph,understand-anything,trellis`.
- `--tools-root <path>`: override tool install root.

## Publish

Current package version is `0.1.0`; the release tag is `v0.1.0`.

Dry-run pack validation:

```bash
NPM_TOKEN=<token> DRY_RUN=true scripts/publish-aiops-npm.sh
```

Publish to npm:

```bash
NPM_TOKEN=<token> DRY_RUN=false scripts/publish-aiops-npm.sh
```

The script runs entirely inside `node:24-bookworm`, validates the package version, prepares packaged skills, runs typecheck, runs `npm pack --dry-run`, and publishes with `npm publish --access public`.
