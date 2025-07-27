# flake.nix (Versión Optimizada y Alineada)
{
  description = "Desarrollo para Albergue Carcalejo: Rust WASM microservicios con Fermyon Spin y React frontend";

  inputs = {
    # Usamos la misma versión que replit.nix para consistencia
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { 
          inherit system; 
          config.allowUnfree = true; 
        };

        # --- Definiciones Personalizadas (Alineadas con replit.nix) ---
        
        spin-version = "v2.2.0";
        spin-cli = pkgs.stdenv.mkDerivation {
          pname = "spin-cli";
          version = spin-version;
          src = pkgs.fetchurl {
            url = "https://github.com/fermyon/spin/releases/download/${spin-version}/spin-${spin-version}-linux-amd64.tar.gz";
            sha256 = "sha256-2ugh7gpoiqMTGe9QPTuXJnd+U5mrSXIQK1TwucuP4s8=";
          };
          # Corregido: usar sourceRoot en lugar de dontUnpack
          sourceRoot = ".";
          installPhase = ''
            mkdir -p $out/bin
            cp spin $out/bin/
            chmod +x $out/bin/spin
          '';
        };

        # Versión actualizada de Bun (puedes usar la que prefieras)
        bun-version = "1.2.19";
        bun-cli = pkgs.stdenv.mkDerivation {
          pname = "bun-cli";
          version = bun-version;
          src = pkgs.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bun-version}/bun-linux-x64.zip";
            sha256 = "sha256-w9PBTppeyD/2fQrP525DFa0G2p809Z/HsTgTeCyvH2Y=";
          };
          nativeBuildInputs = [ pkgs.unzip ];
          installPhase = ''
            mkdir -p $out/bin
            cp bun-linux-x64/bun $out/bin/
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
            pkgs.go-task   # Task runner

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
            spin-cli
            bun-cli
            pkgs.rustc
            pkgs.cargo
            pkgs.nodejs_22
            pkgs.nodePackages.trunk-io
            pkgs.go-task
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