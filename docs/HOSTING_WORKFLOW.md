# Parlay Tracker hosting workflow

## Hosting contract

`SuperL0ng/parlay-tracker` is the authoritative application source.

- GitHub Pages publishes the repository at `https://superl0ng.github.io/parlay-tracker/`.
- ChatGPT Sites publishes `https://parlay.as973.chatgpt.site/` and proxies the live GitHub Pages application.
- Sites owns its hostname-level icon files and injects its own icon/share metadata into both the initial response and the document written by the application wrapper.
- Browser ticket storage remains separate because the two deployments have different origins.

Ordinary application changes therefore require one GitHub commit. They must not trigger a Sites redeployment. Sites source is changed and redeployed only when its proxy, hostname metadata, access settings, or protected icon assets intentionally change.

## Protected Sites files

Do not replace or redirect these files during an application release:

- `app/[[...path]]/route.ts`
- `public/favicon.ico`
- `public/favicon.svg`
- `public/apple-touch-icon.png`
- `public/ssb-favicon-v3-64.png`
- `public/ssb-favicon-v3-128.png`
- `public/ssb-favicon-v3.svg`
- `public/ssb-favicon-v3.ico`
- `public/ssb-touch-v3-180.png`
- `public/ssb-share-v3.png`

The expected hashes are enforced by `scripts/verify-hosting-contract.mjs`.

## Application release

1. Begin from the latest `main` branch and preserve unrelated changes.
2. Make and test the application change in this repository.
3. Run:

   ```sh
   node scripts/verify-hosting-contract.mjs
   ```

4. Commit and push the exact verified state.
5. Wait for GitHub Pages to publish it.
6. Verify both public URLs with an iPhone Safari user agent.
7. Confirm the relevant application behavior on both hosts.
8. Do not save or deploy a new Sites version.

## Sites-hosting release

Use this only for an intentional Sites proxy, metadata, access, custom-domain, or icon change.

1. Open the existing `parlay` Sites checkout through the Sites lifecycle workflow.
2. Before editing, run the cross-host check from this repository:

   ```sh
   node scripts/verify-hosting-contract.mjs --sites-checkout /path/to/sites/parlay
   ```

3. Preserve the protected assets unless the user explicitly approves an icon experiment.
4. Build and test the Sites checkout.
5. Run the same cross-host check again.
6. Save and deploy a Sites version from the exact verified Sites commit.
7. Confirm deployment success through Sites deployment status.
8. Verify the initial HTML metadata, post-`document.write()` metadata, icon responses, and application behavior publicly.

## Release reporting

For every application release, record and report:

- GitHub commit SHA
- GitHub Pages deployment result
- GitHub Pages URL verification
- Sites URL verification against the same application behavior
- Hosting-contract check result
- Whether Sites was redeployed (normally **no**)

Never describe the two hosts as duplicate commits. GitHub contains the application commit; Sites normally exposes that live application through its protected proxy.
