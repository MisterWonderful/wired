#!/usr/bin/env bash
set -e

echo "=== Wired Dev Setup ==="

# Install dependencies
echo "Installing dependencies..."
corepack pnpm install

# Build shared packages first
echo "Building packages..."
corepack pnpm --filter @wired/core build
corepack pnpm --filter @wired/db build
corepack pnpm --filter @wired/git build
corepack pnpm --filter @wired/ai build
corepack pnpm --filter @wired/sync build
corepack pnpm --filter @wired/scanner build
corepack pnpm --filter @wired/ui build

# Push DB schema
echo "Creating database..."
mkdir -p data
corepack pnpm db:push

# Seed demo data
echo "Seeding demo data..."
corepack pnpm seed

echo ""
echo "=== Done! ==="
echo "Run 'corepack pnpm --filter @wired/web dev' to start the web app."
echo "Web app: http://localhost:3008"
