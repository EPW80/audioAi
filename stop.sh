#!/bin/bash

# AudioAI Project Shutdown Script
# This script stops all AudioAI services

echo "🛑 Stopping AudioAI Project..."
echo ""

# Kill any running node processes for this project
echo "Stopping Node.js processes..."
pkill -f "audioai-server" || true
pkill -f "audioai-client" || true
pkill -f "vite.*audioAi/client" || true
pkill -f "tsx.*audioAi/server" || true

# Stop Docker containers
echo "Stopping Docker containers..."
docker compose down

echo ""
echo "✅ All AudioAI services stopped"
