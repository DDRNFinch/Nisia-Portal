# Evia's own address, published from Nisia

Offline learners installed Evia from the DDRNFinch/Evia repository's address. To keep that address working while
Evia is edited only here (`apps/evia`), the Evia repository becomes a publisher that takes `apps/evia` from Nisia's
main branch.

To switch it over, in the DDRNFinch/Evia repository:

1. Add `publish-from-nisia.yml` (this folder) as `.github/workflows/publish-from-nisia.yml`.
2. Remove the old `.github/workflows/evia7-pages.yml` and `evia7-preview.yml`, so only one thing publishes the address.
3. Optionally replace its README with `evia-repo-README.md` (this folder) and remove the old app files; they stay in its history.

It checks every hour and publishes when Nisia's Evia has a new version. Until Nisia's main branch has `apps/evia`,
it publishes nothing and the address keeps its current version.
