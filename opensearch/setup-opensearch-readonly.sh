#!/usr/bin/env bash
# setup-opensearch-readonly.sh
# Creates a read-only role and user in OpenSearch for Grafana DMARC dashboard access.
#
# Usage:
#   export OPENSEARCH_ADMIN_USER=admin
#   export OPENSEARCH_ADMIN_PASS=<admin-password>
#   export GRAFANA_OS_USER=grafana_reader
#   export GRAFANA_OS_PASS=<choose-a-strong-password>
#   bash opensearch/setup-opensearch-readonly.sh
#
# Requires: curl, jq (optional for pretty output)

set -euo pipefail

OS_URL="${OPENSEARCH_URL:-https://172.105.135.195:9200}"
ADMIN_USER="${OPENSEARCH_ADMIN_USER:-admin}"
ADMIN_PASS="${OPENSEARCH_ADMIN_PASS:?Set OPENSEARCH_ADMIN_PASS}"
READER_USER="${GRAFANA_OS_USER:-grafana_reader}"
READER_PASS="${GRAFANA_OS_PASS:?Set GRAFANA_OS_PASS}"

echo "==> Creating role 'dmarc_read_only'..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/roles/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "Read-only access to dmarc_aggregate indices for Grafana",
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

echo "==> Creating user '${READER_USER}'..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/internalusers/${READER_USER}" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"password\": \"${READER_PASS}\",
    \"opendistro_security_roles\": [],
    \"backend_roles\": [],
    \"attributes\": {
      \"purpose\": \"Grafana DMARC dashboard read-only access\"
    }
  }"
echo ""

echo "==> Mapping user '${READER_USER}' to role 'dmarc_read_only'..."
curl -sk -X PUT "${OS_URL}/_plugins/_security/api/rolesmapping/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" \
  -H 'Content-Type: application/json' \
  -d "{
    \"users\": [\"${READER_USER}\"],
    \"backend_roles\": [],
    \"hosts\": []
  }"
echo ""

echo "==> Verifying role..."
curl -sk "${OS_URL}/_plugins/_security/api/roles/dmarc_read_only" \
  -u "${ADMIN_USER}:${ADMIN_PASS}" | python3 -m json.tool 2>/dev/null || true

echo ""
echo "Done. Set OPENSEARCH_USER=${READER_USER} and OPENSEARCH_PASSWORD in Grafana."
