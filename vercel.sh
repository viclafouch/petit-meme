#!/bin/sh
set -e

if [ "$VERCEL_ENV" = "preview" ]; then
  pnpm run build:preview
else
  pnpm run build
fi
