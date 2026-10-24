#!/usr/bin/env bash
# Starts Cohle so people outside your machine can join (over Tailscale, a free private network).
#   tools/share/start.sh            -> uses this Mac's Tailscale IP
#   tools/share/start.sh 100.x.y.z  -> use a specific IP
set -euo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.local/bin:$PATH"

IP="${1:-}"
if [ -z "$IP" ]; then
  TS="$(command -v tailscale || true)"; [ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ] && TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
  [ -n "$TS" ] && IP="$("$TS" ip -4 2>/dev/null | head -1 || true)"
fi
if [ -z "$IP" ]; then
  echo "Não achei o IP do Tailscale. Instale o Tailscale (tailscale.com/download), entre na sua conta e rode de novo,"
  echo "ou passe o IP à mão:  tools/share/start.sh 100.x.y.z"; exit 1
fi

# Own secrets for this machine (created once, never committed): nobody can forge logins or voice tokens.
SECRETS=tools/share/.secrets
if [ ! -f "$SECRETS" ]; then
  umask 077
  { echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "LIVEKIT_API_KEY=cohle$(openssl rand -hex 4)"
    echo "LIVEKIT_API_SECRET=$(openssl rand -hex 32)"; } > "$SECRETS"
fi
set -a; . "$SECRETS"; set +a
export LIVEKIT_NODE_IP="$IP" LIVEKIT_URL="ws://$IP:7880" NODE_ENV=production SEED_TEST_USERS=1 PORT=3001

docker info >/dev/null 2>&1 || { echo "Abra o Docker Desktop e rode de novo."; exit 1; }
docker compose -f infra/docker-compose.yml up -d
echo
echo "============================================================"
echo "  Cohle no ar. Seu amigo usa este endereço no app:"
echo "      $IP:3001"
echo "============================================================"
echo
exec pnpm --filter @cohle/server dev
