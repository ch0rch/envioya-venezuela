#!/usr/bin/env bash
set -euo pipefail
UA="Mozilla/5.0 (envioya-venezuela)"
BASE="https://api.saldo.com.ar/v3"
OUT="test/fixtures"
mkdir -p "$OUT"
curl -s -A "$UA" "$BASE/best_rates?page%5Bsize%5D=500"            > "$OUT/best_rates.json"
curl -s -A "$UA" "$BASE/systems?page%5Bsize%5D=100"               > "$OUT/systems.json"
curl -s -A "$UA" "$BASE/currencies?page%5Bsize%5D=50"             > "$OUT/currencies.json"
curl -s -A "$UA" "$BASE/systems/pago_movil/system_information"    > "$OUT/system_information.pago_movil.json"
echo "fixtures written to $OUT"
