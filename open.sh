#!/usr/bin/env bash
set -euo pipefail

# Check if web/server/.env exists to source default connection settings
if [ -f "web/server/.env" ]; then
  # Source without overriding existing exported vars
  eval "$(grep -E '^(OPENSEARCH_URL|OPENSEARCH_USER|OPENSEARCH_PASSWORD)=' web/server/.env | sed 's/^/export /')"
fi

OPENSEARCH_URL="${OPENSEARCH_URL:-https://172.105.135.195:9200}"
OPENSEARCH_ADMIN_USER="${OPENSEARCH_ADMIN_USER:-${OPENSEARCH_USER:-admin}}"
OPENSEARCH_ADMIN_PASSWORD="${OPENSEARCH_ADMIN_PASSWORD:-${OPENSEARCH_PASSWORD:?Set OPENSEARCH_ADMIN_PASSWORD or OPENSEARCH_PASSWORD in environment or web/server/.env}}"

echo "==> Applying DMARC aggregate index template to ${OPENSEARCH_URL}..."
curl -sk -u "$OPENSEARCH_ADMIN_USER:$OPENSEARCH_ADMIN_PASSWORD" \
  -X PUT "$OPENSEARCH_URL/_index_template/dmarc_aggregate_template" \
  -H "Content-Type: application/json" \
  -d @opensearch/index-template.json

echo ""
echo "==> Seeding test data..."
export OPENSEARCH_URL
export OPENSEARCH_USER="$OPENSEARCH_ADMIN_USER"
export OPENSEARCH_PASSWORD="$OPENSEARCH_ADMIN_PASSWORD"
./scripts/seed-test-data.sh
