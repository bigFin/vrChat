{ pkgs ? import <nixpkgs> {} }:

let
  python = pkgs.python310;
in
pkgs.mkShell {
  buildInputs = [
    python
    python.pkgs.virtualenv
    pkgs.zlib  # Ensure zlib is available
    pkgs.glibc  # Ensure glibc is available for standard libraries
    pkgs.gcc  # Ensure gcc is available for libstdc++.so.6
    pkgs.opencv
    pkgs.ffmpeg
    pkgs.libGL
    pkgs.v4l-utils
    pkgs.nodejs  # Add nodejs to avoid ABI issues
  ];

  shellHook = ''
    export VENV_DIR=".venv"
    export LD_LIBRARY_PATH=${pkgs.zlib.out}/lib:${pkgs.gcc.out}/lib64:${pkgs.stdenv.cc.cc.lib}/lib64:$LD_LIBRARY_PATH
    if [ ! -d "$VENV_DIR" ]; then
      python -m venv $VENV_DIR
      source $VENV_DIR/bin/activate
      pip install --upgrade pip
      pip install uv
    else
      source $VENV_DIR/bin/activate
    fi

    # Ensure node modules install correctly
    export PATH=${pkgs.nodejs}/bin:$PATH

    # Use uv to install Python packages from requirements.txt
    uv pip install -r requirements.txt

    echo "Python version: $(python --version)"
    echo "Python executable: $(which python)"
    echo "Node.js version: $(node --version)"
    echo "LD_LIBRARY_PATH: $LD_LIBRARY_PATH"
  '';
}
