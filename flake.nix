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
      packages = forSystems (pkgs: {
        default =
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
          pkgs.writeShellApplication {
            name = "verbiage";
            runtimeInputs = [ pkgs.nodejs ];
            text = ''
              # First arg (if given) is the data directory; defaults to ./data
              export VERBIAGE_DATA="$(realpath "''${1:-$(pwd)/data}")"
              exec node ${src}/index.js
            '';
          };
      });
    };
}
