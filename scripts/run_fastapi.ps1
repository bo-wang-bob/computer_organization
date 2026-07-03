param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8000,
  [switch]$Reload
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPrefix = Join-Path $ProjectRoot ".conda\comporg-agent"
$PythonExe = Join-Path $EnvPrefix "python.exe"

if (-not (Test-Path $PythonExe)) {
  throw "Conda environment is missing. Run .\scripts\setup_conda_env.ps1 first."
}

$Arguments = @("-m", "uvicorn", "backend.app:app", "--host", $HostName, "--port", $Port)
if ($Reload) {
  $Arguments += "--reload"
}

& $PythonExe @Arguments
