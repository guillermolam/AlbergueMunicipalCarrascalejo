# replit.nix (Enhanced with Custom Node.js 24 + Trunk-io)
{ pkgs }:

let
  # Existing Spin CLI (keep as-is)
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
    '';
  };

  # 🆕 Custom Node.js 24 (Latest LTS)
  nodejs-24 = pkgs.stdenv.mkDerivation rec {
    pname = "nodejs";
    version = "24.12.0"; # nodejs_version
    
    src = pkgs.fetchurl {
      url = "https://nodejs.org/dist/v${version}/node-v${version}-linux-x64.tar.xz";
      sha256 = "sha256-PLACEHOLDER_NODEJS_HASH"; # nodejs_hash
    };
    
    sourceRoot = ".";
    
    installPhase = ''
      mkdir -p $out
      cp -r * $out/
      chmod +x $out/bin/*
    '';
    
    meta = with pkgs.lib; {
      description = "Node.js JavaScript runtime v24 - Custom build";
      homepage = "https://nodejs.org";
      platforms = platforms.linux;
    };
  };

  # 🆕 Custom Trunk-io (Latest)
  trunk-io-custom = pkgs.stdenv.mkDerivation rec {
    pname = "trunk-io";
    version = "1.22.2"; # trunk_version
    
    src = pkgs.fetchurl {
      url = "https://github.com/trunk-io/trunk/releases/download/v${version}/trunk-v${version}-linux-x86_64.tar.gz";
      sha256 = "sha256-PLACEHOLDER_TRUNK_HASH"; # trunk_hash
    };
    
    sourceRoot = ".";
    
    installPhase = ''
      mkdir -p $out/bin
      cp trunk $out/bin/
      chmod +x $out/bin/trunk
    '';
    
    meta = with pkgs.lib; {
      description = "Trunk.io - All-in-one developer experience toolkit";
      homepage = "https://trunk.io";
      platforms = platforms.linux;
    };
  };

in
{
  deps = [
    # Custom packages (Replit-proof!)
    spin-cli
    nodejs-24           # 🆕 Your custom Node.js 24
    trunk-io-custom     # 🆕 Your custom Trunk-io
    
    # Existing Rust toolchain
    pkgs.rustc
    pkgs.cargo
    pkgs.rust-analyzer
    
    # Build tools
    pkgs.go-task
    pkgs.unzip
    pkgs.openssl
    pkgs.pkg-config
    
    # Development tools
    pkgs.k6
    pkgs.zap
    pkgs.taplo-cli
    
    # For auto-update scripts
    pkgs.curl
    pkgs.jq
  ];
}