#!/bin/sh
set -e

echo "Attente de PostgreSQL et application des migrations Prisma..."
MAX_RETRIES=20
COUNT=0
until ./node_modules/.bin/prisma migrate deploy; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Impossible de joindre la base de données après $MAX_RETRIES tentatives."
    exit 1
  fi
  echo "Base indisponible, nouvelle tentative dans 2s ($COUNT/$MAX_RETRIES)..."
  sleep 2
done

echo "Démarrage de LocalImpact sur le port ${PORT:-3000}..."
exec node server.js
