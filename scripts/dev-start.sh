#!/bin/bash
set -e

echo "Starting Albergue del Carrascalejo development environment..."

# Set up Rust environment
export PATH="$HOME/.cargo/bin:$PATH"

# Check if Spin is available
if ! command -v ./spin &> /dev/null; then
    echo "Spin not found, using local installation..."
    export PATH="./spin:$PATH"
fi

# Build WASM services first
echo "Building WASM services..."
./scripts/build-wasm.sh

# Start the gateway in background
echo "Starting Spin gateway on port 8000..."
cd gateway
../spin up --listen 0.0.0.0:8000 &
GATEWAY_PID=$!
cd ..

# Wait a moment for gateway to start
sleep 3

# Start frontend
echo "Starting frontend on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:5173"
echo "🚀 Gateway: http://localhost:8000"
echo ""
echo "To stop services:"
echo "kill $GATEWAY_PID $FRONTEND_PID"

# Keep script running
wait