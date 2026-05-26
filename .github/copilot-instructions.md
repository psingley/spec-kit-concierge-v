<!-- SPECKIT START -->
Plan: `specs/0001-foundation-shell/plan.md`

Run 1 conventions:
- TypeScript: `strict` + `noUncheckedIndexedAccess`.
- ESLint: Pure/Effect layer-boundary rules at `error`.
- Scripts: `dev`, `lint`, `lint:fix`, `typecheck`, `test`, `test:coverage`, `test:watch`, `e2e`, `package`, `make`.
- Logging: pino writes under `app.getPath('userData')/logs/`.
- Packaging: Forge NSIS maker lives in `electron-forge.config.*`.
- CI: GitHub Actions runs Windows-only on `push` and `pull_request`.
<!-- SPECKIT END -->
