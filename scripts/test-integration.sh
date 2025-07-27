
#!/bin/bash
set -e

echo "🧪 Running Gateway Integration Tests"

# Get random port for test isolation
PORT=$(./scripts/random-ports.sh 3000 4000 | head -1)
export GATEWAY_TEST_PORT=$PORT

echo "📊 Using test port: $PORT"

# Build WASM components first
echo "🔨 Building WASM components..."
cd gateway && cargo build --target wasm32-wasi --release && cd ..
cd backend && cargo build --target wasm32-wasi --release --workspace --exclude shared && cd ..

echo "📦 Building Spin application..."
spin build

# Start Spin gateway in background
echo "🚀 Starting Spin gateway on port $PORT..."
spin up --listen 0.0.0.0:$PORT &
SPIN_PID=$!

# Wait for gateway to start
sleep 5

# Verify gateway is running
echo "🔍 Verifying gateway health..."
if curl -f "http://0.0.0.0:$PORT/api/health" > /dev/null 2>&1; then
    echo "✅ Gateway is healthy"
else
    echo "❌ Gateway health check failed"
    kill $SPIN_PID 2>/dev/null || true
    exit 1
fi

# Run integration tests
echo "🧪 Running integration tests..."
cd tests/integration

# Set environment variable for dynamic port
export GATEWAY_TEST_PORT=$PORT

# Run the tests
GATEWAY_TEST_PORT=$PORT cargo test --test gateway_integration_test -- --test-threads=1

TEST_RESULT=$?

# Cleanup
echo "🧹 Cleaning up..."
kill $SPIN_PID 2>/dev/null || true
wait $SPIN_PID 2>/dev/null || true

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All integration tests passed!"
else
    echo "❌ Some integration tests failed"
    exit 1
fi
