# Nisia

Apprenticeship platform for learners, assessors, tutors and employers.

## Architecture

Companion-first PWAs (Evia, Milos, Symi, Paros) sync to a unified Nisia backend. See [docs/architecture/nisia-shared-core.md](../Milos/docs/architecture/nisia-shared-core.md) for the full design.

## Repository structure

```
nisia/
├─ apps/              PWA front-ends for each role
│  ├─ evia/           Apprentice app (evidence capture, learning hours)
│  ├─ milos/          Assessor app (reviews, observations, judgements)
│  ├─ symi/           Tutor app (sessions, registers, OTJ delivery)
│  ├─ paros/          Employer app (link-based, sign & view)
│  └─ nisia-web/      Platform dashboard (managers, quality, admin)
├─ packages/          Shared code across all apps
│  ├─ model/          Entity types, Zod schemas, state machines
│  ├─ store/          Dexie database, repositories, outbox
│  ├─ sync/           Push/pull engine, conflict rules, media upload queue
│  ├─ auth/           Sign-in, device pairing, role/permission helpers
│  ├─ courses/        Course pack schema, loader, migrations
│  ├─ rules/          Funding rule sets (review intervals, OTJ minimums)
│  ├─ ui/             Design tokens, avatar, components
│  ├─ pdf/            Review, observation, mileage PDF templates
│  ├─ media/          Capture, compression, video/audio handling
│  ├─ qr/             QR pairing codes and legacy contract
│  ├─ export/         Export profiles for Aptem, Smart Assessor, OneFile
│  ├─ crypto/         Pairing keys, payload encryption, backups
│  └─ ai/             (later) Draft generation client, provenance tagging
├─ services/          Backend and infrastructure
│  ├─ supabase/       SQL migrations, RLS policies, seed data
│  ├─ functions/      Edge functions: sync, sign, pdf, export, ai-draft
│  ├─ relay/          Companion-mode encrypted relay (ciphertext only)
│  └─ licence/        Organisations, activation codes, seats, metrics
├─ course-packs/      Source .nisi course pack definitions
├─ tools/             Migration scripts (Milos v2 → core, Evia → core)
└─ docs/              Architecture and guidance
```

## Getting started

1. Install dependencies: `pnpm install`
2. See individual app and package READMEs for development setup

## Phases

**Phase 0 (Foundations):** Monorepo, bring in Evia and Milos, port shared code into packages.

**Phase 1 (Companion core):** Rebuild Evia on shared packages, Aptem/Smart Assessor export profiles, companion mode.

**Phase 2 (Relay):** Pairing, encrypted relay, Evia→Milos evidence handover.

**Phase 3 (Paros & Symi):** Employer signing, tutor app.

**Phase 4 (Platform):** Supabase backend, Nisia web, sync engine.

**Phase 5 (Pro integrations):** SSO, MIS, AI drafting, analytics.
