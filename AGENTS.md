# AGENTS.md

This file is the operational entrypoint for AI agents working in this repository.

## Read Order

1. `README.md` for project orientation.
2. `CLAUDE.md` for the main product/learning goals and visualization roadmap.
3. `UIUA_GUIDE.md` for the Uiua coding workflow used in this codebase.

## Uiua Reference Source

The synced Uiua primitive reference file is:

- `docs/reference/uiua/uiua_primitive_defs.rs`

Do not hand-edit this file. Regenerate it with:

- `bun run uiua:sync-defs`

## Required Working Practices

1. Run Uiua commands from repo root to avoid nested cache folders.
2. Validate Uiua modules with:
   `bun run uiua:check`
3. For interactive eval matching browser runtime behavior:
   `bun run uiua:eval -- <module.ua> "<expr>"`
4. If cache folders accumulate:
   `bun run uiua:clean-cache`

## Notes

`build:wasm` runs `uiua:sync-defs-if-needed` automatically, so changes to `core/Cargo.lock` (Uiua parser version bumps) refresh the synced primitive defs during builds.
