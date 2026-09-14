# Contributing

Thanks for helping improve Octarine Web Clipper.

1. Search existing issues before starting substantial work.
2. Fork the repository and create a focused branch.
3. Install with `pnpm install --frozen-lockfile`.
4. Add tests for behavior changes and avoid including private page content in logs or fixtures.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, and `pnpm package`.
6. Open a pull request explaining the user-facing result and how it was verified.

Keep changes small and preserve cross-browser behavior. New permissions must be necessary, documented in the pull request, and reflected in the privacy policy and store disclosures. New destination behavior must match the current Octarine desktop deep-link contract.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
