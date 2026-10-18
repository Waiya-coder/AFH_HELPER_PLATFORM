#!/bin/bash
# Start AFH Helper locally — run this in Terminal, keep the window open.
set -e
cd "$(dirname "$0")/.."

echo "🛑 Stopping old servers on ports 5173 and 3001..."
lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "🐘 Ensuring PostgreSQL is running..."
if command -v brew >/dev/null 2>&1; then
  brew services start postgresql@16 2>/dev/null || true
fi

echo "🚀 Starting API (port 3001)..."
npm run dev:api &
API_PID=$!

sleep 2

echo "🚀 Starting Web (port 5173)..."
npm run dev:web &
WEB_PID=$!

sleep 3

if curl -sf http://127.0.0.1:5173 >/dev/null && curl -sf http://127.0.0.1:3001/health >/dev/null; then
  echo ""
  echo "✅ AFH Helper is running!"
  echo "   Open in your browser: http://127.0.0.1:5173/login"
  echo ""
  echo "   Demo login: staff@demo.afh / password123"
  echo ""
  echo "   ⚠️  Keep THIS Terminal window open. Closing it stops the app."
  echo ""
  open "http://127.0.0.1:5173/login"
else
  echo "❌ Something failed to start. Run these manually in two terminals:"
  echo "   npm run dev:api"
  echo "   npm run dev:web"
  kill $API_PID $WEB_PID 2>/dev/null || true
  exit 1
fi

wait
