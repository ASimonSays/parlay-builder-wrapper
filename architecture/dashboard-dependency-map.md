# Dashboard dependency map — pre-replacement audit

## Live repositories

| Build | Repository | Branch | Domain |
|---|---|---|---|
| Gold | `SuperL0ng/parlay-tracker` | `main` | `simonsports.bet` |
| Silver | `SuperL0ng/SuperL0ng.github.io` | `main` | `simonsportsbetting.com` |

Neither live branch is modified by work under `agent/canonical-app-architecture`.

## Current runtime chain

The gold entry point fetches a historical `index.html`, rewrites it in the browser, injects the patch stack, and calls `document.write()`. Silver contains the historical application inline and loads the same patch stack directly.

The effective dashboard chain is:

1. Historical inline `renderTicketDashboard()`.
2. `settlement-status.js` replaces that renderer.
3. `navigation-links-v24.js`, `ticket-sharing.js`, `optional-sportsbook.js`, `ticket-dashboard-details-v54.js`, `dashboard-layout-v56.js`, `dashboard-polish-v63.js`, `dashboard-more-actions-v64.js`, and `dashboard-sort-filter-v78.js` wrap or repair dashboard output.
4. `show-legs-label-fix.js` adds a second expansion/selection/ID-binding controller with observers and delayed repair passes.
5. `dashboard-refresh-v58.js`, `settlement-status.js`, and `actual-settlement-time.js` divide refresh and settlement ownership.

## Replacement ownership

| Responsibility | Canonical owner |
|---|---|
| Ticket persistence and ID migration | `app/src/scripts/storage.js` |
| Filtering and sorting | `DashboardController.recordsForRender()` |
| Dashboard rendering | `app/src/scripts/dashboard-controller.js` |
| Expansion state | `DashboardController.state.expandedIds` |
| Selection and deletion | `DashboardController.state.selectedIds` |
| Actions menu | `DashboardController.showActions()` |
| Dashboard presentation | `app/src/styles/dashboard.css` |
| Theme differences | `app/config/builds.json` → generated `theme.css` |
| Gold/silver generation | `scripts/build-static.mjs` |

## Data-preservation contract

The replacement retains the existing key:

```text
parlayTracker.savedTickets.v1
```

Existing IDs are preserved. Missing or duplicated IDs receive one stable ID during the storage migration. Rendering never infers identity from card position.

## Explicitly prohibited in the replacement

- runtime loading of historical HTML;
- `document.write()`;
- positional record/card binding;
- sorting DOM nodes after rendering;
- dashboard render wrappers;
- dashboard-wide mutation observers;
- delayed dashboard repair passes;
- `show-legs-label-fix.js`;
- temporary GitHub verification or promotion workflows.
