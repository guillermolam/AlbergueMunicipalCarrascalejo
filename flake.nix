# This is a complete flake.nix for your project.
# It defines a development environment that can be used locally with the command `nix develop`.
{
  description = "A development environment for the Albergue Carcalejo project with Rust, Spin, and Bun.";

  # --- Inputs ---
  # These are the external dependencies of your flake.
  # They are pinned in the flake.lock file for perfect reproducibility.
  inputs = {
    # The main Nix package collection. We pin it to a specific release.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";

    # A helper library that makes it easy to define outputs for different systems (Linux, macOS, etc.).
    flake-utils.url = "github:numtide/flake-utils";
  };

  # --- Outputs ---
  # These are the "things" your flake provides, like packages or development shells.
  outputs = { self, nixpkgs, flake-utils }:
    # Use the flake-utils helper to generate outputs for common systems.
    flake-utils.lib.eachDefaultSystem (system:
      let
        # Define pkgs for the current system (e.g., x86_64-linux).
        pkgs = import nixpkgs { inherit system; };

        # --- Custom Packages ---
        # These are the same derivations from our replit.nix file.

        spin-version = "v2.2.0";
        spin-cli = pkgs.stdenv.mkDerivation {
          pname = "spin-cli";
          version = spin-version;
          src = pkgs.fetchurl {
            url = "https://github.com/fermyon/spin/releases/download/${spin-version}/spin-${spin-version}-linux-amd64.tar.gz";
            sha256 = "1k1r4b1vj1v2zjw1x9s8yq298q9z4y1h4v2zjw1x9s8yq298q9z4y1h4"; # Placeholder hash
          };
          installPhase = ''
            mkdir -p $out/bin
            cp spin $out/bin/
          '';
        };

        bun-version = "1.0.25";
        bun-cli = pkgs.stdenv.mkDerivation {
          pname = "bun-cli";
          version = bun-version;
          src = pkgs.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bun-version}/bun-linux-x64.zip";
            sha256 = "1j2k3l4j5k6l7j8k9l0j1k2j3l4j5k6l7j8k9l0j1k2j3l4j5k6l7j8k"; # Placeholder hash
          };
          nativeBuildInputs = [ pkgs.unzip ];
          installPhase = ''
            mkdir -p $out/bin
            cp bun-linux-x64/bun $out/bin/
          '';
        };

      in
      {
        # --- Development Shell ---
        # This defines the environment you get when you run `nix develop`.
        devShells.default = pkgs.mkShell {
          # The list of packages to make available in the shell.
          # This is the equivalent of the `deps` list in replit.nix.
          buildInputs = [
            # Custom Packages
            spin-cli
            bun-cli

            # Rust Tooling
            pkgs.rustc
            pkgs.cargo
            pkgs.rust-analyzer
            pkgs.taplo-cli

            # Linting and Formatting
            pkgs.trunk-io

            # Build Dependencies
            pkgs.openssl
            pkgs.pkg-config
          ];
        };
      }
    );
}