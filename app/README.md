# Canonical Parlay Tracker application

This directory is the source of both production builds.

```text
app/src + app/config/builds.json
          ↓
 scripts/build-static.mjs
          ↓
 build/gold
 build/silver
```

The two builds may differ only through generated theme and metadata values. Application JavaScript and `dashboard.css` must be identical.

The current files are an off-live architecture scaffold. They intentionally do not replace either live `main` branch.
