
#!/bin/bash

set -e

echo "🚀 Setting up development environment..."

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command cargo
check_command psql

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm ci

# Install Rust dependencies and build WASM
echo "🦀 Building Rust WASM modules..."
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

./build-bff.sh

# Setup database
echo "🗄️ Setting up database..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Please configure your database connection."
else
    echo "Database connection configured"
fi

# Setup environment
echo "⚙️ Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file from template. Please configure your environment variables."
fi

echo "🎉 Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env file"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Run 'npm test' to run the test suite"
