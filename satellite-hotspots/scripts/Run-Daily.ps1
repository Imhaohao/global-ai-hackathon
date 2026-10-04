param(
    [Parameter(Mandatory=$true)][string]$Manifest,
    [Parameter(Mandatory=$true)][string]$Checkpoint,
    [string]$Python = 'python',
    [string]$Output = 'daily-output',
    [string]$State = 'daily-state.sqlite',
    [string]$SmsConfig = 'config/sms.example.json'
)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
# The imagery adapter must publish a complete, aligned manifest atomically before this runs.
# Daily execution cannot create a new satellite acquisition or remove clouds.
& $Python -m hotspots infer $Manifest --checkpoint $Checkpoint --output $Output
if ($LASTEXITCODE -ne 0) { throw 'Inference failed. No alerts sent.' }
& $Python -m hotspots monitor (Join-Path $Output 'predictions.json') --output $Output --state $State --sms-config $SmsConfig
if ($LASTEXITCODE -ne 0) { throw 'Monitoring failed. Review the run output.' }
