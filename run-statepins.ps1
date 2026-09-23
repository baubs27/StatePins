param(
  [switch]$Tunnel,
  [switch]$LiveApi
)

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$runtimeRoot = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies"
$nodeDir = Join-Path $runtimeRoot "node\bin"
$toolsDir = Join-Path $runtimeRoot "bin"
$pnpm = Join-Path $toolsDir "pnpm.cmd"
$expo = Join-Path $projectRoot "apps\mobile\node_modules\.bin\expo.cmd"
$apiEnv = Join-Path $projectRoot "apps\api\.env"
$apiEnvExample = Join-Path $projectRoot "apps\api\.env.example"
$mobileRoot = Join-Path $projectRoot "apps\mobile"
$logRoot = Join-Path $projectRoot ".statepin-logs"
$apiOutLog = Join-Path $logRoot "api.out.log"
$apiErrLog = Join-Path $logRoot "api.err.log"

function Get-StateUpLanIp {
  $interfaces = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object {
      $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
      $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback -and
      $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Tunnel -and
      $_.Description -notmatch "Virtual|VPN|PANGP|TAP|TUN|Hyper-V|VMware|VirtualBox|Loopback|Bluetooth" -and
      $_.Name -notmatch "Virtual|VPN|PANGP|TAP|TUN|Hyper-V|VMware|VirtualBox|Loopback|Bluetooth"
    }

  $preferredInterfaces = @(
    $interfaces | Where-Object { $_.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Wireless80211 }
    $interfaces | Where-Object { $_.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Ethernet }
    $interfaces
  )

  foreach ($interfaceGroup in $preferredInterfaces) {
    foreach ($interface in $interfaceGroup) {
      $addresses = $interface.GetIPProperties().UnicastAddresses |
        Where-Object {
          $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
          -not $_.Address.ToString().StartsWith("169.254.")
        } |
        ForEach-Object { $_.Address.ToString() }

      $preferred = $addresses | Where-Object {
        $_.StartsWith("192.168.") -or $_.StartsWith("10.") -or ($_ -match "^172\.(1[6-9]|2[0-9]|3[0-1])\.")
      } | Select-Object -First 1

      if ($preferred) { return $preferred }
      $firstAddress = $addresses | Select-Object -First 1
      if ($firstAddress) { return $firstAddress }
    }
  }

  return $null
}

function Test-StateUpApiHealth {
  param([string]$Uri)
  try {
    $health = Invoke-RestMethod -Uri $Uri -TimeoutSec 1
    return [bool]$health.ok
  }
  catch {
    return $false
  }
}

if (-not (Test-Path -LiteralPath $pnpm)) {
  Write-Host "Codex's bundled Node runtime was not found." -ForegroundColor Red
  Write-Host "Install Node.js 20 or newer from https://nodejs.org, then run: npm install --global pnpm"
  exit 1
}

$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Process")
if (-not $currentPath) {
  $currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "Process")
}
[System.Environment]::SetEnvironmentVariable("PATH", $null, "Process")
[System.Environment]::SetEnvironmentVariable("Path", "$nodeDir;$toolsDir;$currentPath", "Process")
Remove-Item Env:EXPO_OFFLINE -ErrorAction SilentlyContinue
$env:EXPO_NO_TELEMETRY = "1"
$env:EXPO_NO_DEPENDENCY_VALIDATION = "1"
$env:EXPO_PUBLIC_OFFLINE_DEV = "1"
$env:EXPO_PUBLIC_USE_API = if ($LiveApi) { "1" } else { "0" }
Set-Location -LiteralPath $projectRoot
New-Item -ItemType Directory -Force -Path $logRoot | Out-Null

if (-not (Test-Path -LiteralPath $apiEnv)) {
  $secret = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
  $contents = Get-Content -Raw -LiteralPath $apiEnvExample
  $contents = $contents.Replace("replace-with-at-least-32-random-characters", $secret)
  Set-Content -LiteralPath $apiEnv -Value $contents -Encoding UTF8
  Write-Host "Created apps\api\.env with a local development secret." -ForegroundColor Green
}

Write-Host "Installing/checking dependencies..." -ForegroundColor Cyan
& $pnpm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Preparing the local database..." -ForegroundColor Cyan
& $pnpm --filter "@statepins/api" db:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $pnpm db:seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
if ($Tunnel) {
  Write-Host "Starting StateUp through Expo tunnel. Scan the Expo QR code when it appears." -ForegroundColor Green
}
else {
  Write-Host "Starting StateUp on your local network. Scan the Expo QR code when it appears." -ForegroundColor Green
}
Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor DarkGray
if ($LiveApi) {
  Write-Host "Live API mode is on. Account changes and social activity use the local server." -ForegroundColor DarkGray
}
else {
  Write-Host "Phone dev mode uses local demo data, so the app will not wait on backend API requests." -ForegroundColor DarkGray
  Write-Host "Use run-api.cmd when you want to test real saved accounts and server sync." -ForegroundColor DarkGray
}
Write-Host "If the QR still times out before the app opens, run allow-statepin-firewall.cmd once." -ForegroundColor Yellow

$portsInUse = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
$metroPort = 8081..8099 | Where-Object { $_ -notin $portsInUse } | Select-Object -First 1
if (-not $metroPort) {
  Write-Host "No available Expo port was found between 8081 and 8099." -ForegroundColor Red
  exit 1
}

Write-Host "Using Expo port $metroPort." -ForegroundColor DarkGray
$lanIp = $env:STATEUP_LAN_IP
if (-not $lanIp) {
  $lanIp = Get-StateUpLanIp
}
if ($lanIp) {
  $env:EXPO_PUBLIC_API_URL = "http://$lanIp`:4000"
  $env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
  Write-Host "Phone API URL: $env:EXPO_PUBLIC_API_URL" -ForegroundColor DarkGray
Write-Host "Expo LAN host: $env:REACT_NATIVE_PACKAGER_HOSTNAME" -ForegroundColor DarkGray
}
else {
  Write-Host "Could not detect a LAN IP. The phone may time out unless EXPO_PUBLIC_API_URL is set manually." -ForegroundColor Yellow
}

$apiProcess = $null
$apiReady = Test-StateUpApiHealth -Uri "http://127.0.0.1:4000/health"
if ($apiReady) {
  Write-Host "StateUp API is already running on port 4000; reusing it." -ForegroundColor DarkGray
}
else {
  $apiProcess = Start-Process `
    -FilePath $pnpm `
    -ArgumentList @("--filter", "@statepins/api", "dev") `
    -WorkingDirectory $projectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $apiOutLog `
    -RedirectStandardError $apiErrLog `
    -PassThru

  for ($attempt = 0; $attempt -lt 12; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($apiProcess.HasExited) { break }
    if (Test-StateUpApiHealth -Uri "http://127.0.0.1:4000/health") {
      $apiReady = $true
      break
    }
  }
}

if (-not $apiReady) {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
  Write-Host "StateUp API is not available on port 4000, but phone demo mode does not need it." -ForegroundColor Yellow
  Write-Host "Continuing to Expo so the QR code can appear." -ForegroundColor Yellow
  Write-Host "Last API log lines:" -ForegroundColor DarkGray
  if (Test-Path -LiteralPath $apiOutLog) { Get-Content -LiteralPath $apiOutLog -Tail 8 }
  if (Test-Path -LiteralPath $apiErrLog) { Get-Content -LiteralPath $apiErrLog -Tail 8 }
}

if ($apiReady -and $lanIp) {
  try {
    if (-not (Test-StateUpApiHealth -Uri "http://$lanIp`:4000/health")) {
      Write-Host "The API started, but the LAN health check did not return OK." -ForegroundColor Yellow
    }
  }
  catch {
    Write-Host "The API is running locally, but this computer's LAN address did not answer on port 4000." -ForegroundColor Yellow
    Write-Host "If the phone still times out, allow Node.js through Windows Firewall for private networks." -ForegroundColor Yellow
  }
}

try {
  Set-Location -LiteralPath $mobileRoot
  if ($Tunnel) {
    & $expo start --tunnel --clear --port $metroPort
  }
  else {
    & $expo start --host lan --clear --port $metroPort
  }
  exit $LASTEXITCODE
}
finally {
  Set-Location -LiteralPath $projectRoot
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
}
