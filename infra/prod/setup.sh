#!/usr/bin/env bash
# One-shot installer for a fresh Ubuntu/Debian machine (e.g. Oracle Cloud Always Free).
#   curl/git the repo onto the machine, then:   sudo bash infra/prod/setup.sh seu-dominio.duckdns.org
set -euo pipefail
DOMAIN="${1:-}"
[ -n "$DOMAIN" ] || { echo "Uso: sudo bash infra/prod/setup.sh SEU-DOMINIO (ex.: cohle.duckdns.org)"; exit 1; }
cd "$(dirname "$0")"

if ! command -v docker >/dev/null; then
  echo "==> Instalando Docker"; curl -fsSL https://get.docker.com | sh
fi

# Firewall: Oracle's Ubuntu images ship iptables rules that block everything but SSH.
open_ports() {
  if command -v ufw >/dev/null && ufw status | grep -q active; then
    ufw allow 80/tcp; ufw allow 443/tcp; ufw allow 7881/tcp; ufw allow 50000:50100/udp
  else
    for rule in "-p tcp --dport 80" "-p tcp --dport 443" "-p tcp --dport 7881" "-p udp --dport 50000:50100"; do
      iptables -C INPUT $rule -j ACCEPT 2>/dev/null || iptables -I INPUT 5 $rule -j ACCEPT
    done
    command -v netfilter-persistent >/dev/null && netfilter-persistent save || true
  fi
}
echo "==> Abrindo portas no firewall da máquina"; open_ports

if [ ! -f .env ]; then
  echo "==> Gerando segredos novos em infra/prod/.env"
  umask 077
  cat > .env <<ENV
DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
LIVEKIT_API_KEY=cohle$(openssl rand -hex 4)
LIVEKIT_API_SECRET=$(openssl rand -hex 32)
ENV
else
  echo "==> infra/prod/.env já existe (mantido)"
fi

echo "==> Subindo o Cohle"
docker compose up -d --build
echo
echo "============================================================"
echo "  Cohle no ar em:  https://$DOMAIN"
echo "  (o certificado HTTPS é emitido sozinho em ~1 minuto)"
echo "  No app: Servidor > alterar > https://$DOMAIN"
echo "============================================================"
echo "Lembre de abrir TAMBÉM no painel da Oracle (Security List): TCP 80, 443, 7881 e UDP 50000-50100."
