# Services

Backend and infrastructure for the Nisia platform.

## Companion mode (Phases 1-3)

- **licence** — Organisations, activation codes, seat management, anonymous metrics
- **relay** — Encrypted relay for evidence handover and device backups (ciphertext only)

## Platform mode (Phase 4+)

- **supabase** — SQL migrations, RLS policies, seed data, schema management
- **functions** — Edge functions for sync, signing, PDF generation, exports, AI drafts

Run locally with `supabase start` (see [Supabase CLI docs](https://supabase.com/docs/guides/local-development)).
