$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPrefix = Join-Path $ProjectRoot ".conda\comporg-agent"
$PythonExe = Join-Path $EnvPrefix "python.exe"

if (-not (Test-Path $PythonExe)) {
  throw "Conda environment is missing. Run .\scripts\setup_conda_env.ps1 first."
}

& $PythonExe -m unittest tests.test_backend_core
