$ErrorActionPreference = 'Stop'

# Run once in an elevated PowerShell. This script does not replace the
# existing wbti Caddy site or its port-8787 analytics service.
$InstallDir = 'C:\taluo-ai'
$DataDir = 'C:\ProgramData\taluo-ai'
$TaskName = 'TaluoAI'
$SourceRef = 'main'
$NodeVersion = 'v24.19.0'
$NodeMsi = "$env:TEMP\node-$NodeVersion-x64.msi"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-x64.msi"
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$Entry = "$InstallDir\index.mjs"
$EnvFile = "$InstallDir\.env"
$Runner = "$InstallDir\run.ps1"
$CaddyFile = 'C:\caddy\Caddyfile'
$CaddyExe = 'C:\caddy\caddy.exe'

function Download-File([string]$Url, [string]$Path) {
  Write-Host "Downloading $Url"
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path
}

New-Item -ItemType Directory -Force -Path $InstallDir, $DataDir | Out-Null

if (-not (Test-Path $NodeExe)) {
  Download-File $NodeUrl $NodeMsi
  Start-Process msiexec.exe -ArgumentList "/i `"$NodeMsi`" /qn /norestart" -Wait
}
if (-not (Test-Path $NodeExe)) {
  throw "Node.js 安装失败：找不到 $NodeExe"
}

foreach ($file in @('index.mjs', 'package.json')) {
  $url = "https://raw.githubusercontent.com/lydia20031020-prog/taluo/$SourceRef/server/$file"
  Download-File $url (Join-Path $InstallDir $file)
}

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

if (Get-NetTCPConnection -State Listen -LocalPort 8790 -ErrorAction SilentlyContinue) {
  throw '端口 8790 已被其他程序占用，已停止部署且未修改 Caddy。'
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

if (-not (Test-Path $CaddyFile)) { throw "找不到现有 Caddy 配置：$CaddyFile" }
if (-not (Test-Path $CaddyExe)) { throw "找不到 Caddy：$CaddyExe" }

$caddyText = Get-Content -Path $CaddyFile -Raw
if ($caddyText -notmatch '(?m)^api\.taluo\.lydiaowo\.com\s*\{') {
  $backup = "$CaddyFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Copy-Item $CaddyFile $backup
  @"

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
    throw "Caddy 配置校验失败，已恢复备份：$backup"
  }
  & $CaddyExe reload --config $CaddyFile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $CaddyFile -Force
    & $CaddyExe reload --config $CaddyFile --adapter caddyfile
    throw "Caddy 重新加载失败，已恢复备份：$backup"
  }
}

Write-Host "完成：TaluoAI 使用 127.0.0.1:8790；现有 wbti 配置未被替换。"
Write-Host "下一步：在 C:\taluo-ai\.env 填入新的 DeepSeek API Key，然后重新运行 TaluoAI 计划任务。"
