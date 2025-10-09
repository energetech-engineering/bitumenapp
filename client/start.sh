#!/bin/bash
# Start frontend dev server

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting frontend on http://localhost:5173"
npm run dev
