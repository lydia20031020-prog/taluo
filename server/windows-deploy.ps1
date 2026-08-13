$ErrorActionPreference = 'Stop'

# Run once in an elevated PowerShell. This script does not replace the
# existing wbti Caddy site or its port-8787 analytics service.
$InstallDir = 'C:\taluo-ai'
$DataDir = 'C:\ProgramData\taluo-ai'
$SiteDir = 'C:\sites\taluo'
$TaskName = 'TaluoAI'
$SourceRef = 'main'
$PnpmRoot = 'C:\taluo-tools'
$NodeVersion = 'v22.23.2'
$NodeArchiveName = "node-$NodeVersion-win-x64"
$NodeZip = "$env:TEMP\$NodeArchiveName.zip"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/$NodeArchiveName.zip"
$NodeRoot = "$PnpmRoot\$NodeArchiveName"
$NodeExe = "$NodeRoot\node.exe"
$SiteArchiveSha256 = '6A2BDB851F1F1950CDC5C21AFE6418015EF9B6E8703E9A18369D187C7932E2FB'
$Entry = "$InstallDir\index.mjs"
$EnvFile = "$InstallDir\.env"
$Runner = "$InstallDir\run.ps1"
$CaddyFile = 'C:\caddy\Caddyfile'
$CaddyExe = 'C:\caddy\caddy.exe'

function Download-File([string]$Url, [string]$Path) {
  Write-Host "Downloading $Url"
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path
}

New-Item -ItemType Directory -Force -Path $InstallDir, $DataDir, $SiteDir | Out-Null

if (-not (Test-Path $NodeExe)) {
  Download-File $NodeUrl $NodeZip
  Expand-Archive -Path $NodeZip -DestinationPath $PnpmRoot -Force
}
if (-not (Test-Path $NodeExe)) {
  throw "Node.js installation failed: $NodeExe was not found."
}

# Keep this deployment on Node 22 without changing other server applications.
$env:Path = "$NodeRoot;$PnpmRoot;$env:Path"
& $NodeExe --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js validation failed.' }

$BuildId = [guid]::NewGuid().ToString('N')
$BuildRoot = Join-Path $env:TEMP "taluo-source-$BuildId"
$SourceZip = Join-Path $env:TEMP "taluo-source-$BuildId.zip"
$SourceUrl = "https://github.com/lydia20031020-prog/taluo/archive/refs/heads/$SourceRef.zip"
Download-File $SourceUrl $SourceZip
Expand-Archive -Path $SourceZip -DestinationPath $BuildRoot -Force
$SourceDir = Get-ChildItem -Path $BuildRoot -Directory | Select-Object -First 1
if (-not $SourceDir) { throw 'Tarot source directory was not found.' }

$SiteArchive = Join-Path $SourceDir.FullName 'server\taluo-site.zip'
if (-not (Test-Path $SiteArchive)) { throw 'The prebuilt H5 archive was not found.' }
$ActualSiteArchiveSha256 = (Get-FileHash $SiteArchive -Algorithm SHA256).Hash
if ($ActualSiteArchiveSha256 -ne $SiteArchiveSha256) {
  throw 'The prebuilt H5 archive checksum is invalid.'
}
$DistDir = Join-Path $BuildRoot 'site'
Expand-Archive -Path $SiteArchive -DestinationPath $DistDir -Force
$IndexFile = Join-Path $DistDir 'index.html'
$AppBundle = Get-ChildItem -Path (Join-Path $DistDir 'js\app.*.js') -File -ErrorAction SilentlyContinue
$CssBundles = Get-ChildItem -Path (Join-Path $DistDir 'css\*.css') -File -ErrorAction SilentlyContinue
$LargestScript = Get-ChildItem -Path (Join-Path $DistDir 'js\*.js') -File -ErrorAction SilentlyContinue |
  Sort-Object Length -Descending |
  Select-Object -First 1
if (-not (Test-Path $IndexFile) -or -not $AppBundle -or -not $CssBundles -or -not $LargestScript -or $LargestScript.Length -lt 100000) {
  throw 'The prebuilt H5 archive is incomplete. Existing website files were preserved.'
}

& robocopy $DistDir $SiteDir /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -gt 7) { throw "Website file copy failed: robocopy exit code=$LASTEXITCODE." }
Copy-Item (Join-Path $SourceDir.FullName 'server\index.mjs') $Entry -Force
Copy-Item (Join-Path $SourceDir.FullName 'server\package.json') (Join-Path $InstallDir 'package.json') -Force

if (-not (Test-Path $EnvFile)) {
  @(
    'PORT=8790'
    'DEEPSEEK_BASE_URL=https://api.deepseek.com'
    'DEEPSEEK_MODEL=deepseek-v4-flash'
    'DEEPSEEK_API_KEY='
    'FRONTEND_ORIGINS=https://lydia20031020-prog.github.io,https://www.taluo.lydiaowo.com'
    'DAILY_REQUEST_LIMIT=200'
    'DAILY_IP_LIMIT=20'
    'USAGE_STATE_FILE=C:\ProgramData\taluo-ai\usage.json'
  ) | Set-Content -Path $EnvFile -Encoding ascii
}

$envAcl = New-Object System.Security.AccessControl.FileSecurity
$envAcl.SetAccessRuleProtection($true, $false)
$systemAccount = (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')).Translate(
  [System.Security.Principal.NTAccount]
)
$adminAccount = (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')).Translate(
  [System.Security.Principal.NTAccount]
)
foreach ($account in @($systemAccount, $adminAccount)) {
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $account,
    'FullControl',
    'Allow'
  )
  $envAcl.AddAccessRule($rule)
}
Set-Acl -Path $EnvFile -AclObject $envAcl

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
$portConnections = @(Get-NetTCPConnection -State Listen -LocalPort 8790 -ErrorAction SilentlyContinue)
foreach ($connection in $portConnections) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)"
  if ($process.Name -eq 'node.exe' -and ([string]$process.CommandLine).Contains($Entry)) {
    Stop-Process -Id $connection.OwningProcess -Force
  }
  else {
    throw "Port 8790 is used by another process: PID $($connection.OwningProcess)."
  }
}
if ($portConnections.Count -gt 0) {
  Start-Sleep -Seconds 2
}
if (Get-NetTCPConnection -State Listen -LocalPort 8790 -ErrorAction SilentlyContinue) {
  throw 'The previous TaluoAI process did not release port 8790.'
}

@"
Set-Location '$InstallDir'
& '$NodeExe' --env-file='$EnvFile' '$Entry' *>> '$DataDir\service.log'
exit `$LASTEXITCODE
"@ | Set-Content -Path $Runner -Encoding ascii

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
$action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`"" `
  -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings | Out-Null
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

if (-not (Test-Path $CaddyFile)) { throw "Existing Caddy config was not found: $CaddyFile" }
if (-not (Test-Path $CaddyExe)) { throw "Caddy executable was not found: $CaddyExe" }

$caddyText = Get-Content -Path $CaddyFile -Raw
if ($caddyText -notmatch '(?m)^www\.taluo\.lydiaowo\.com\s*\{') {
  $backup = "$CaddyFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item $CaddyFile $backup
  @"

www.taluo.lydiaowo.com {
    root * C:\sites\taluo
    encode zstd gzip
    @assets path /js/* /css/* /static/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    header {
        -Server
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
    try_files {path} /index.html
    file_server
}

api.taluo.lydiaowo.com {
    encode zstd gzip
    header {
        -Server
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
    }
    route {
        @api_methods method POST OPTIONS
        handle @api_methods {
            reverse_proxy 127.0.0.1:8790
        }
        handle {
            respond 404
        }
    }
}
"@ | Add-Content -Path $CaddyFile -Encoding ascii

  & $CaddyExe validate --config $CaddyFile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $CaddyFile -Force
    throw "Caddy config validation failed. The backup was restored: $backup"
  }
  & $CaddyExe reload --config $CaddyFile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $CaddyFile -Force
    & $CaddyExe reload --config $CaddyFile --adapter caddyfile
    throw "Caddy reload failed. The backup was restored: $backup"
  }
}

Write-Host "Done: www.taluo.lydiaowo.com was deployed to $SiteDir."
Write-Host "Done: TaluoAI uses 127.0.0.1:8790; the existing wbti config was preserved."
Write-Host "Next: add a new DeepSeek API key to C:\taluo-ai\.env, then restart the TaluoAI scheduled task."
