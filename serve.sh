#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"
DIR="$(dirname "$(realpath "$0")")"

# Get local IP (first non-loopback IPv4)
IP="$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 | head -1)"

echo "Serving CandyTracker at:"
echo "  http://localhost:${PORT}"
echo "  http://${IP}:${PORT}"
echo ""
echo "Open http://${IP}:${PORT} on your phone to install the PWA."
echo "---"

exec serve "$DIR" -p "${PORT}"
