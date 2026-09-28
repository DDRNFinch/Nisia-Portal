# Nisia backend (Supabase)

Project **Nisia**, `ffgfigkeeeauzkifopei`, London (eu-west-2).
API: `https://ffgfigkeeeauzkifopei.supabase.co` · publishable key in `packages/core/nisia.js` (public by design).

## Database

Every table has row-level security. Staff actions need the authenticator app (`aal2`), checked by `private.mfa_ok()`.
The full SQL history is in the project's migration table; pull it with the Supabase CLI (`supabase db pull`).

| Migrations | What they do |
|---|---|
| 1 Sept 2026 (17) | Organisations, members and roles, learners and staff access, courses and criteria, evidence and files (private storage), off-the-job hours, witness testimonies, reviews and sign-offs, targets, observations, notifications, audit log, Evia pairing tokens, and all the security rules |
| `platform_admin_seats_and_invites` | Master admin (`platform_admins`), college licences (`organisations.seats/status/licence_ends/contact`), seat limit enforced on adding a learner, enrolment details (status, planned off-the-job hours, employer, NVQ options), one-time `invites`, the six roles, Evia's four courses, and the `nisia_*` functions the portal reads |
| `simplify_seats_used`, `seats_used_for_service` | How seats are counted: a learner uses one until all their enrolments are completed or withdrawn |
| `grants_for_orgs_invites_admins` | Table access for the new tables (the schema denies by default) |
| `platform_admin_can_view_college_portal` | The master admin can open a college's portal |
| `enable_pg_net_for_function_tests` | Lets the edge functions be tested from SQL (`net.http_post`) |

## Edge functions (`services/functions`)

| Function | Sign-in | What it does |
|---|---|---|
| `nisia-setup` | none | `accept`: an invite link sets a password and joins a college (or makes the master admin). `pair`: Evia's pairing code, returns the learner's details and a one-time sign-in |
| `nisia-admin` | staff | Colleges and seats (master admin), invites, adding learners (uses a seat), staff access, Evia pairing codes |

Deploy with the Supabase CLI (`supabase functions deploy nisia-setup --no-verify-jwt`, `supabase functions deploy nisia-admin`),
or through Claude. Shared code is in `_shared/nisia.ts`.

## Sign-in

Staff: email and password (at least 10 characters, with upper and lower case, a number and a symbol), then an
authenticator app. No emails are sent by Supabase: invite links are made in the portal and sent by the person
inviting. The first master admin invite (for the developer) was created directly in the database.

Learners: no password. Their assessor or college shows a pairing QR (`NISI:PAIR:2:<code>`, 30 minutes, single use);
Evia exchanges it for a sign-in.
