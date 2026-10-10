#!/usr/bin/env bash
# setup-sentinel-readonly.sh
# Provisions a dedicated least-privilege read-only user ('sentinel_reader') in OpenSearch
# for the DMARC Sentinel backend API.
#
# Usage:
#   export OPENSEARCH_ADMIN_USER=admin
#   export OPENSEARCH_ADMIN_PASS=<admin-password>
#   export SENTINEL_OS_USER=sentinel_reader
#   export SENTINEL_OS_PASS=<choose-a-strong-password>
#   bash opensearch/setup-sentinel-readonly.sh

set -euo pipefail

# Try sourcing from web/server/.env if variables are unset
if [ -f "web/server/.env" ]; then
  eval "$(grep -E '^(OPENSEARCH_URL|OPENSEARCH_USER|OPENSEARCH_PASSWORD)=' web/server/.env | sed 's/^/export /')" || true
fi

OS_URL="${OPENSEARCH_URL:-https://172.105.135.195:9200}"
ADMIN_USER="${OPENSEARCH_ADMIN_USER:-admin}"
ADMIN_PASS="${OPENSEARCH_ADMIN_PASS:-${OPENSEARCH_PASSWORD:?Set OPENSEARCH_ADMIN_PASS or OPENSEARCH_PASSWORD}}"
READER_USER="${SENTINEL_OS_USER:-sentinel_reader}"
READER_PASS="${SENTINEL_OS_PASS:?Set SENTINEL_OS_PASS for the new read-only user}"

echo "==> Ensuring 'dmarc_read_only' role exists in OpenSearch..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/roles/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "Read-only access to dmarc_aggregate indices for DMARC Sentinel Backend API",
    "cluster_permissions": ["cluster_composite_ops_ro"],
    "index_permissions": [{
      "index_patterns": ["dmarc_aggregate-*"],
      "allowed_actions": [
        "read",
        "indices:data/read/*",
        "indices:admin/mappings/get",
        "indices:admin/resolve/index",
        "indices:monitor/settings/get"
      ]
    }],
    "tenant_permissions": []
  }'
echo ""

echo "==> Creating / updating service account user '${READER_USER}'..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/internalusers/${READER_USER}" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"password\": \"${READER_PASS}\",
    \"opendistro_security_roles\": [],
    \"backend_roles\": [],
    \"attributes\": {
      \"purpose\": \"DMARC Sentinel backend read-only service account\"
    }
  }"
echo ""

echo "==> Mapping '${READER_USER}' to role 'dmarc_read_only'..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/rolesmapping/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"users\": [\"${READER_USER}\"],
    \"backend_roles\": [],
    \"hosts\": []
  }"
echo ""

echo "==> Verifying role mapping..."
curl -sk "${OS_URL}/_plugins/_security/api/roles/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" | head -n 30 || true

echo ""
echo "✅ Done! Update your web/server/.env with:"
echo "   OPENSEARCH_USER=${READER_USER}"
echo "   OPENSEARCH_PASSWORD=${READER_PASS}"
