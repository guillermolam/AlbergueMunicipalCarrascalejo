# Development dependencies setup for Windows PowerShell
Write-Host "🚀 Setting up development dependencies..." -ForegroundColor Green

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Bun is available
try {
    $bunVersion = bun --version
    Write-Host "✅ Bun found: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Bun not found, attempting to install..." -ForegroundColor Yellow
    try {
        irm bun.sh/install.ps1 | iex
        $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
        Write-Host "✅ Bun installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to install Bun" -ForegroundColor Red
        exit 1
    }
}

# Check if Rust is available
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Rust from https://rustup.rs/" -ForegroundColor Yellow
    exit 1
}

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location -Path "frontend"
bun install
Set-Location -Path ".."

# Install Rust dependencies
Write-Host "📦 Installing Rust dependencies..." -ForegroundColor Cyan
cargo fetch --workspace

Write-Host "✅ All dependencies installed successfully!" -ForegroundColor Green