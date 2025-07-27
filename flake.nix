# flake.nix (Versión Definitiva)
{
  description = "Desarrollo para Albergue Carcalejo: Rust WASM microservicios con Fermyon Spin y React frontend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # ✅ Correcto: allowUnfree para trunk-io
        pkgs = import nixpkgs { 
          inherit system; 
          config.allowUnfree = true; 
        };

        # --- Definiciones Personalizadas ---
        
        spin-version = "v2.2.0";
        spin-cli = pkgs.stdenv.mkDerivation {
          pname = "spin-cli";
          version = spin-version;
          src = pkgs.fetchurl {
            url = "https://github.com/fermyon/spin/releases/download/${spin-version}/spin-${spin-version}-linux-amd64.tar.gz";
            sha256 = "sha256-2ugh7gpoiqMTGe9QPTuXJnd+U5mrSXIQK1TwucuP4s8=";
          };
          sourceRoot = ".";
          installPhase = ''
            mkdir -p $out/bin
            cp spin $out/bin/
            chmod +x $out/bin/spin
          '';
        };

        # ✅ Corregido: Hash y estructura de Bun
        bun-version = "1.2.19";
        bun-cli = pkgs.stdenv.mkDerivation {
          pname = "bun-cli";
          version = bun-version;
          src = pkgs.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bun-version}/bun-linux-x64.zip";
            # Hash correcto del error anterior
            sha256 = "sha256-w9PBTppeyD/2fQrP525DFa0G2p809Z/HsTgTeCyvH2Y=";
          };
          nativeBuildInputs = [ pkgs.unzip ];
          installPhase = ''
            mkdir -p $out/bin
            # ✅ Corregido: el archivo está directamente en la raíz
            cp bun $out/bin/
            chmod +x $out/bin/bun
          '';
        };

      in
      {
        # Shell de desarrollo principal
        devShells.default = pkgs.mkShell {
          buildInputs = [
            # --- Runtimes y Herramientas de Compilación ---
            spin-cli
            bun-cli
            pkgs.rustc
            pkgs.cargo
            pkgs.nodejs_22

            # --- Herramientas de Calidad y Sistema ---
            # ✅ Correcto: trunk-io como dijiste
            pkgs.trunk-io
            pkgs.go-task

            # --- Soporte para el IDE ---
            pkgs.rust-analyzer

            # --- Dependencias de Compilación Esenciales ---
            pkgs.openssl
            pkgs.pkg-config
            pkgs.unzip
          ];

          # Variables de entorno útiles para desarrollo
          shellHook = ''
            echo "🏨 Entorno de desarrollo Albergue Carcalejo activado"
            echo "📦 Spin CLI: $(spin --version)"
            echo "🟨 Bun: $(bun --version)"
            echo "🦀 Rust: $(rustc --version)"
            echo "📋 Task: $(task --version)"
            echo "🔧 Trunk: $(trunk --version)"
            echo ""
            echo "Comandos útiles:"
            echo "  task          - Ver todas las tareas disponibles"
            echo "  trunk check   - Ejecutar todos los linters"
            echo "  trunk fmt     - Formatear todo el código"
            echo "  spin up       - Ejecutar el servidor local"
            echo ""
          '';
        };

        # Shell alternativo solo para CI/CD (más ligero)
        devShells.ci = pkgs.mkShell {
          buildInputs = [
            # --- Runtimes Core ---
            spin-cli
            bun-cli
            pkgs.rustc
            pkgs.cargo
            pkgs.rustfmt
            pkgs.clippy
            pkgs.nodejs_22
          
            # --- Herramientas de Sistema ---
            pkgs.trunk-io
            pkgs.go-task
            pkgs.caddy              # Gateway
            pkgs.semgrep           # SAST
            
            # --- Base de Datos ---
            pkgs.postgresql        # Para migraciones y tests
            pkgs.postgresql_16     # PostgreSQL 16 client
            pkgs.sqlx-cli          # Para SQLx migrations
            
            # --- Testing Completo ---
            pkgs.nodePackages.testcafe    # E2E testing
            pkgs.nodePackages.lighthouse  # Performance
            pkgs.nodePackages.prettier    # Code formatting
            pkgs.nodePackages.eslint      # Linting
            pkgs.nodePackages.typescript  # TypeScript support
            pkgs.k6                       # Load testing
            pkgs.nuclei                   # Security scanning
            pkgs.semgrep                  # SAST analysis
            
            # --- Herramientas de Seguridad ---
            pkgs.cargo-audit       # Rust security audit
            pkgs.zap               # OWASP ZAP
            pkgs.semgrep           # SAST analysis
            pkgs.nuclei            # Vulnerability scanning
            
            # --- Utilidades ---
            pkgs.curl              # Health checks
            pkgs.jq                # JSON processing
            pkgs.git               # Version control
            
            # --- Desarrollo ---
            pkgs.rust-analyzer
            pkgs.openssl
            pkgs.pkg-config
            pkgs.unzip
          ];
        };

        # Paquetes que puedes instalar individualmente
        packages = {
          inherit spin-cli bun-cli;
          default = spin-cli;
        };
      }
    );
}