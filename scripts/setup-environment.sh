#!/bin/bash
set -e

# Centralized environment setup script
# Usage: ./scripts/setup-environment.sh [component]

COMPONENT="${1:-all}"
RUST_VERSION="1.87.0"
NODE_VERSION="20.x"
BUN_VERSION="1.2.x"
SPIN_VERSION="3.3.x"

echo " Setting up environment: $COMPONENT"

check_tools() {
    echo " Checking development tools..."
    
    local missing_tools=()
    
    command -v rustc &> /dev/null || missing_tools+=("rust")
    command -v cargo &> /dev/null || missing_tools+=("cargo")
    command -v node &> /dev/null || missing_tools+=("node")
    command -v bun &> /dev/null || missing_tools+=("bun")
    command -v spin &> /dev/null || missing_tools+=("spin")
    
    if [[ ${#missing_tools[@]} -eq 0 ]]; then
        echo " All tools are available"
        rustc --version
        cargo --version
        node --version
        bun --version 2>/dev/null || echo "Bun not available, using npm"
        spin --version
    else
        echo "  Missing tools: ${missing_tools[*]}"
        return 1
    fi
}

install_rust() {
    echo " Installing Rust toolchain..."
    
    if ! command -v rustup &> /dev/null; then
        echo "Installing rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source ~/.cargo/env
    fi
    
    rustup update
    rustup target add wasm32-wasip1
    
    # Install useful cargo tools
    cargo install cargo-watch 2>/dev/null || echo "cargo-watch already installed"
    cargo install cargo-audit 2>/dev/null || echo "cargo-audit already installed"
    
    echo " Rust toolchain installed"
}

install_node() {
    echo " Installing Node.js dependencies..."
    
    # Install Bun if not available
    if ! command -v bun &> /dev/null; then
        echo "Installing Bun..."
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
    fi
    
    # Install frontend dependencies
    if [[ -f "frontend/package.json" ]]; then
        echo "Installing frontend dependencies..."
        cd frontend
        bun install || npm install
        cd - > /dev/null
    fi
    
    # Install auth service frontend dependencies
    if [[ -f "backend/auth-service/package.json" ]]; then
        echo "Installing auth service frontend dependencies..."
        cd backend/auth-service
        bun install || npm install
        cd - > /dev/null
    fi
    
    echo " Node.js dependencies installed"
}

install_spin() {
    echo " Installing Spin CLI..."
    
    if ! command -v spin &> /dev/null; then
        curl -fsSL https://developer.fermyon.com/downloads/install.sh | bash
        sudo mv spin /usr/local/bin/ 2>/dev/null || echo "Please move spin to PATH manually"
    else
        echo "Spin already installed"
    fi
    
    spin --version
    echo " Spin CLI installed"
}

install_all_dependencies() {
    echo " Installing all dependencies..."
    
    # Install Rust dependencies
    if [[ -f "Cargo.toml" ]]; then
        echo "Fetching Rust dependencies..."
        cargo fetch
    fi
    
    # Install backend dependencies
    if [[ -d "backend" ]]; then
        echo "Installing backend dependencies..."
        cd backend
        cargo fetch
        cd - > /dev/null
    fi
    
    install_node
    
    echo " All dependencies installed successfully"
}

setup_database() {
    echo "  Setting up database..."
    
    if [[ -f "database/scripts/setup-db.sh" ]]; then
        ./database/scripts/setup-db.sh
    else
        echo "  Database setup script not found, skipping..."
    fi
}

case $COMPONENT in
    "check")
        check_tools
        ;;
    "rust")
        install_rust
        ;;
    "node"|"frontend")
        install_node
        ;;
    "spin")
        install_spin
        ;;
    "deps"|"dependencies")
        install_all_dependencies
        ;;
    "database"|"db")
        setup_database
        ;;
    "all")
        echo " Setting up complete development environment..."
        install_rust
        install_spin
        install_all_dependencies
        setup_database
        check_tools
        echo " Development environment setup complete!"
        ;;
    *)
        echo " Unknown component: $COMPONENT"
        echo "Available components: check, rust, node, spin, deps, database, all"
        exit 1
        ;;
esac