# Changelog

Notable user-facing changes are recorded here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses semantic versioning.

## [Unreleased]

## [1.0.0] - 2026-09-15

### Added

- Dedicated Chromium, Firefox, and Safari builds and release packages.
- All documented keyboard commands in each browser manifest.
- Desktop-compatible property types, deep-link callbacks, templates, content references, and search links.
- User-created clipping templates with wildcard URL matching, Markdown formatting, custom properties, and folder destinations.
- Automated lint, typecheck, test, and packaging checks.

### Changed

- Renamed the product consistently to Octarine Web Clipper.
- Save-without-opening now applies to every clipping workflow.
- Folder-based clipping remains the destination model; managed Inbox support is not included.

### Fixed

- Metadata is retained when article extraction uses the fallback path.
- Potentially sensitive page and deep-link debug output was removed.
- YAML metadata keys are safely serialized and reserved `oct.*` properties are ignored.

### Security

- Updated transitive build dependencies with known advisories.
