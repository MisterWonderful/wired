#!/usr/bin/env bash
set -e

echo "=== Wired Dev Setup ==="

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build shared packages first
echo "Building packages..."
pnpm --filter @wired/core build
pnpm --filter @wired/db build
pnpm --filter @wired/git build
pnpm --filter @wired/ai build
pnpm --filter @wired/sync build
pnpm --filter @wired/scanner build
pnpm --filter @wired/ui build

# Push DB schema
echo "Creating database..."
mkdir -p data
pnpm db:push

# Seed demo data
echo "Seeding demo data..."
pnpm seed

echo ""
echo "=== Done! ==="
echo "Run 'pnpm dev' to start the web app."
echo "Web app: http://localhost:3000"