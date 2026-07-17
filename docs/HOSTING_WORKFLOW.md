# Parlay Tracker hosting and release workflow

## Repository roles

- `SuperL0ng/parlay-tracker` is the **app repo**: the authoritative development and staging application. Its final custom domain is `https://simonsports.bet/`, and its identity is always gold.
- `SuperL0ng/SuperL0ng.github.io` is the **root repo**: the independent public production deployment. Its final custom domain is `https://simonsportsbetting.com/`, and its identity is silver.

Theme identity belongs to the repository, not to hostname-detection logic. The app repo is gold wherever it is opened. The root repo is silver wherever it is opened.

## Deployment contract

The root repo is self-contained. It must not fetch, mirror, rewrite, or load the app repo at runtime. A production release is promoted by copying a tested app release into the root repo and then applying only the root repo's silver identity, metadata, and deployment contract.

The two custom domains are separate browser origins. Each therefore has an independent `localStorage` ticket library. Ticket libraries do not follow repository or domain reassignment automatically. Export both libraries before any domain migration.

## App-repo release

1. Make and test the change in `parlay-tracker`.
2. Run `node scripts/verify-hosting-contract.mjs`.
3. Confirm JavaScript syntax checks pass.
4. Publish and test `https://simonsports.bet/`.
5. Do not alter the root repo until the app release is approved for production.

## Production promotion

1. Export the ticket libraries from both custom domains.
2. Copy the approved application files into the root repo through a controlled promotion.
3. Preserve the root repo's silver icons, manifest, metadata, CNAME, and independent asset paths.
4. Run the root deployment verifier.
5. Publish and test `https://simonsportsbetting.com/`.
6. Verify ticket views, Active Tickets, Close behavior, header images, icons, manifests, share metadata, and domain-local ticket storage.

## Domain roles

| Domain | Repository | Role | Identity |
|---|---|---|---|
| `simonsports.bet` | `parlay-tracker` | development/staging | gold |
| `simonsportsbetting.com` | `SuperL0ng.github.io` | public production | silver |
