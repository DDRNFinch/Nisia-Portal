#!/bin/sh
# Evia (its own repository) uses the same Nisia actions file as the other apps: copy it across after changing it.
#   sh tools/sync-actions.sh [path to the Evia repository, default ../Evia7]
set -e
here=$(cd "$(dirname "$0")/.." && pwd); evia=${1:-$here/../Evia7}
cp "$here/packages/core/nisia-actions.js" "$evia/nisia-actions.js"
echo "Copied nisia-actions.js to $evia"
