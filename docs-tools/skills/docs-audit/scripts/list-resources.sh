#!/usr/bin/env bash
# list-resources.sh
# Run from the Rails project root to inventory codebase resources and existing doc pages.
# Used by /docs-audit to identify documentation gaps.

set -euo pipefail

echo "=== CONTROLLERS ==="
find app/controllers -name "*.rb" \
  -not -name "application_controller.rb" \
  -not -path "*/concerns/*" \
  | sort

echo ""
echo "=== MODELS ==="
find app/models -name "*.rb" \
  -not -name "application_record.rb" \
  -not -path "*/concerns/*" \
  | sort

echo ""
echo "=== ROUTES (resource declarations) ==="
grep -En "^\s*(resources|resource|namespace|scope)\b" config/routes.rb | sort

echo ""
echo "=== EXISTING DOC PAGES ==="
if [ -d "docs/src/content/docs" ]; then
  find docs/src/content/docs \( -name "*.mdx" -o -name "*.md" \) | sort
else
  echo "(no docs/src/content/docs directory found — run /add-docs-site first)"
fi
