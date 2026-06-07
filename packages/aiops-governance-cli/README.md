# AIOps Governance CLI

Executable workspace bootstrap for AIOps knowledge governance.

## Commands

- `install`: copy repo-local AIOps skills into runtime skill directories.
- `init`: initialize `.aiops/`, project skeleton, guides, hooks, and platform hook config.
- `setup`: run `install` and then `init`.

## Docker Usage

Run from the repository root without using host `node`, `npm`, or `npx`:

```bash
docker run --rm -it \
  -v "$PWD":/repo \
  -w /repo/packages/aiops-governance-cli \
  node:24-bookworm \
  bash -lc "npm ci && npm run build && node dist/cli.js setup --yes --project cert-auth --products CA,RA,KMC,OCSP"
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
