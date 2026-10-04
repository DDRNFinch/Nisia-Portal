#!/bin/sh
# Runs the registers SQL against a fresh local Postgres database (as the postgres user): sh tests/sql/run.sh
set -e
cd "$(dirname "$0")"
DB=nisia_registers_test
su postgres -c "dropdb --if-exists $DB && createdb $DB"
for f in stub.sql live-helpers.sql symi-only.sql ../../services/supabase/registers.sql ../../services/supabase/classes-rls-fix.sql ../../services/supabase/actions-registers.sql ../../services/supabase/actions-feedback.sql registers-test.sql rls-classes.sql; do
  su postgres -c "psql -X -q -t -o /dev/null -v ON_ERROR_STOP=1 -d $DB -f $(pwd)/$f" 2>&1 | grep -v 'does not exist, skipping' | sed 's/^psql:[^ ]* NOTICE:  /  /'
done
