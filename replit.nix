# replit.nix (Final Version with Unpacking Fix)
{ pkgs }:

let
  spin-version = "v2.2.0";
  spin-cli = pkgs.stdenv.mkDerivation {
    pname = "spin-cli";
    version = spin-version;
    src = pkgs.fetchurl {
      url = "https://github.com/fermyon/spin/releases/download/${spin-version}/spin-${spin-version}-linux-amd64.tar.gz";
      # This is the correct hash for the spin v2.2.0 archive.
      sha256 = "sha256-2ugh7gpoiqMTGe9QPTuXJnd+U5mrSXIQK1TwucuP4s8=";
    };

    # --- THE FIX IS HERE ---
    # This tells the Nix builder that the source files are in the root
    # of the archive, not in a subdirectory.
    sourceRoot = ".";

    # The install phase is the same, it copies the 'spin' file.
    installPhase = ''
      mkdir -p $out/bin
      cp spin $out/bin/
    '';
  };

in
{
  deps = [
    spin-cli
    pkgs.rustc
    pkgs.cargo
    pkgs.nodejs_22
    pkgs.trunk-io
    pkgs.go-task
    pkgs.unzip
    pkgs.k6
    pkgs.zap
    pkgs.rust-analyzer
    pkgs.taplo-cli
    pkgs.openssl
    pkgs.pkg-config
  ];
}
