param(
  [switch]$ForceUpdate
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvPrefix = Join-Path $ProjectRoot ".conda\comporg-agent"
$EnvironmentFile = Join-Path $ProjectRoot "environment.yml"
$PythonExe = Join-Path $EnvPrefix "python.exe"
$CondaExe = (Get-Command conda.exe -ErrorAction Stop).Source

$env:CONDA_NO_PLUGINS = "true"
$env:CONDA_REPORT_ERRORS = "false"

function Invoke-CondaExe {
  param([string[]]$Arguments)

  & $CondaExe @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "conda $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

function Test-BackendEnv {
  if (-not (Test-Path $PythonExe)) {
    return $false
  }
  & $PythonExe -c "import fastapi, uvicorn; print(f'FastAPI {fastapi.__version__}; Uvicorn {uvicorn.__version__}')"
  return $LASTEXITCODE -eq 0
}

if ((Test-Path $EnvPrefix) -and -not $ForceUpdate -and (Test-BackendEnv)) {
  Write-Host "Conda environment is ready: $EnvPrefix"
  exit 0
}

if (Test-Path $EnvPrefix) {
  Invoke-CondaExe @("env", "update", "--solver", "classic", "--prefix", $EnvPrefix, "--file", $EnvironmentFile, "--prune")
} else {
  Invoke-CondaExe @("env", "create", "--solver", "classic", "--prefix", $EnvPrefix, "--file", $EnvironmentFile)
}

Test-BackendEnv | Out-Null
