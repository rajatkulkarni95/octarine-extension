# Publishing Octarine Web Clipper

Store publication requires developer accounts, identity verification, signatures, screenshots, and manual review. Those external steps cannot be performed by the build script.

## Release checklist

1. Update the version in `package.json` and all files under `manifest.json` / `manifests/` to the same value.
2. Update `CHANGELOG.md` and create a signed release tag.
3. Run `pnpm install --frozen-lockfile` and `pnpm package`.
4. Verify the generated manifests and test each unpacked build with the release version of Octarine.
5. Prepare store copy, support URL, this privacy-policy URL, icons, and screenshots without private page content.
6. Upload the appropriate artifact and complete each store's permission/privacy questionnaire accurately.

The extension needs `activeTab`, `scripting`, tabs, context menus, storage, and broad host access to extract user-requested pages. Do not claim narrower access in store disclosures unless the manifest and implementation have changed.

## Chrome Web Store (Chrome, Edge, Brave)

1. Enroll in the Chrome Web Store developer program and create a new item.
2. Upload `artifacts/octarine-web-clipper-chromium.zip`.
3. Complete the single-purpose, permission-justification, data-use, distribution, and contact sections.
4. Link to the hosted `PRIVACY.md` page and submit for review.

The same Chromium package can be submitted separately to Microsoft Edge Add-ons. Brave users can install the Chrome Web Store listing.

## Firefox Add-ons

1. Create an AMO developer account.
2. Upload `artifacts/octarine-web-clipper-firefox.zip` as a new extension.
3. If requested, upload a source archive and document `pnpm install --frozen-lockfile && pnpm build:firefox` as the reproducible build command.
4. Download Mozilla's signed XPI after review. Do not distribute the unsigned ZIP as a normal Firefox install.

Keep the Gecko extension ID in `manifests/manifest.firefox.json` stable across releases.
Firefox 142 is the current minimum because it supports Mozilla's required built-in no-data-collection declaration.

## Safari App Extension

Safari distribution is an app-signing workflow, not a ZIP upload.

1. On macOS with Xcode installed, run `pnpm safari:convert`.
2. Open the generated Xcode project, select the correct Apple Developer team, and verify the bundle identifier.
3. Add app metadata, screenshots, privacy answers, and signing capabilities in App Store Connect.
4. Archive in Xcode, validate, upload, and submit the macOS app for review.

## After approval

- Install each public listing on a clean browser profile.
- Verify clipping, selection, bookmark append, save-without-opening, settings persistence, and Octarine protocol prompts.
- Add final store links to `README.md` and `USER_GUIDE.md`.
- Publish release notes and retain the exact signed artifacts for rollback.
