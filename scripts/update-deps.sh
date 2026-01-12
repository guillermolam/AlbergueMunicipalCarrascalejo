#!/bin/bash
set -e

echo "=== Cargo Dependency Updater ==="
echo ""

# Check for cargo-edit
if ! command -v cargo-upgrade &> /dev/null; then
  echo "cargo-edit not found. Installing (this takes ~2-3 minutes on first run)..."
  echo "You can cancel and manually install with: cargo install cargo-edit"
  cargo install cargo-edit
  echo "cargo-edit installed successfully!"
else
  echo "cargo-edit found: $(cargo-upgrade --version)"
fi

echo ""
echo "Updating dependencies in backend services..."
for dir in backend/auth-service backend/booking-service backend/document-validation-service \
           backend/info-on-arrival-service backend/location-service backend/notification-service \
           backend/rate-limiter-service backend/redis-service backend/reviews-service \
           backend/security-service backend/mqtt-broker-service backend/redis-cache-service \
           backend/shared; do
  if [ -f "$dir/Cargo.toml" ]; then
    echo "  -> Updating $dir"
    (cd "$dir" && cargo upgrade --incompatible --skip-compatible 2>/dev/null || true)
  fi
done

echo ""
echo "Updating dependencies in gateway..."
for dir in gateway/api-gateway gateway/api-gateway-core gateway/edge-proxy; do
  if [ -f "$dir/Cargo.toml" ]; then
    echo "  -> Updating $dir"
    (cd "$dir" && cargo upgrade --incompatible --skip-compatible 2>/dev/null || true)
  fi
done

echo ""
echo "=== Update Complete ==="
echo "Run 'task build:all' or 'spin build' to rebuild with updated dependencies."
