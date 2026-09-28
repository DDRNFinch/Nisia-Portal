# Packages

Shared code across all apps, published as a monorepo so changes propagate everywhere.

## Core packages

- **model** — Entity types, Zod schemas, state machines, validation
- **store** — Dexie database layer, repositories, outbox for sync
- **sync** — Sync engine: push/pull, conflict rules, media upload queue
- **auth** — Sign-in, device pairing, role/permission helpers

## Feature packages

- **courses** — Course pack schema, loader, version migrations
- **rules** — Funding rule sets (review intervals, OTJ minimums, review sections)
- **ui** — Design tokens, avatar component, shared UI components
- **pdf** — PDF templates for reviews, observations, mileage
- **media** — Media capture, compression, video/audio processing
- **qr** — QR pairing codes and legacy v1 contract
- **export** — Export profiles for Aptem, Smart Assessor, OneFile, generic
- **crypto** — Pairing keys, payload encryption, encrypted backups
- **ai** — (later) Draft generation client, provenance tagging

Each package has its own `package.json` and can be published independently if needed.
