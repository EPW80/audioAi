#!/bin/bash

# AudioAI Project Startup Script
# This script starts MongoDB, Redis, the backend server, and frontend client

set -e

echo "🚀 Starting AudioAI Project..."
echo ""

# Check if server/.env exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  Warning: server/.env not found"
    echo "Creating from server/.env.example..."
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        echo "✅ Created server/.env - Please update JWT_SECRET before production use"
    else
        echo "❌ Error: server/.env.example not found"
        exit 1
    fi
fi

# Start MongoDB and Redis
echo "📦 Starting MongoDB and Redis containers..."
docker compose up -d

# Wait for containers to be ready
echo "⏳ Waiting for services to be ready..."
sleep 3

# Start the backend server
echo "🔧 Starting backend server..."
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait for server to initialize
sleep 3

# Start the frontend client
echo "🎨 Starting frontend client..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo ""
echo "✅ AudioAI is starting up!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend:  http://localhost:3001"
echo ""
echo "💡 Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    docker compose down
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
