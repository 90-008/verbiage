{
  description = "verbiage wiki engine";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forSystems (pkgs:
        let
          src = pkgs.stdenv.mkDerivation {
            pname = "verbiage-src";
            version = "main";
            src = ./.;
            installPhase = ''
              mkdir -p $out
              cp -r . $out/
            '';
          };
        in
        {
          default = pkgs.writeShellApplication {
            name = "verbiage";
            runtimeInputs = [ pkgs.nodejs ];
            text = ''
              # First arg (if given) is the data directory; defaults to ./data
              VERBIAGE_DATA="$(realpath "''${1:-$(pwd)/data}")"
              export VERBIAGE_DATA
              exec node ${src}/index.js
            '';
          };
          build = pkgs.writeShellApplication {
            name = "verbiage-build";
            runtimeInputs = [ pkgs.nodejs ];
            text = ''
              # Resolve VERBIAGE_DATA (set by caller or default to ./data)
              VERBIAGE_DATA="$(realpath "''${VERBIAGE_DATA:-$(pwd)/data}")"
              export VERBIAGE_DATA
              exec node ${src}/build.js "$@"
            '';
          };
        });
    };
}
