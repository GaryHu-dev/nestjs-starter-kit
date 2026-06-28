#!/bin/sh

set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created"
fi

pnpm install

docker compose up -d

echo "Setup completed"
