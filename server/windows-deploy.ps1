$ErrorActionPreference = 'Stop'

# Run once in an elevated PowerShell. This script does not replace the
# existing wbti Caddy site or its port-8787 analytics service.
$InstallDir = 'C:\taluo-ai'
$DataDir = 'C:\ProgramData\taluo-ai'
$SiteDir = 'C:\sites\taluo'
$TaskName = 'TaluoAI'
$SourceRef = 'main'
$NodeVersion = 'v24.19.0'
$NodeMsi = "$env:TEMP\node-$NodeVersion-x64.msi"
$NodeUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-x64.msi"
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$NpmExe = 'C:\Program Files\nodejs\npm.cmd'
$PnpmRoot = 'C:\taluo-tools'
$PnpmExe = "$PnpmRoot\pnpm.cmd"
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
  Download-File $NodeUrl $NodeMsi
  Start-Process msiexec.exe -ArgumentList "/i `"$NodeMsi`" /qn /norestart" -Wait
}
if (-not (Test-Path $NodeExe)) {
  throw "Node.js 安装失败：找不到 $NodeExe"
}

if (-not (Test-Path $PnpmExe)) {
  & $NpmExe install --global pnpm@10.27.0 --prefix $PnpmRoot
  if ($LASTEXITCODE -ne 0 -or -not (Test-Path $PnpmExe)) {
    throw "pnpm 安装失败：找不到 $PnpmExe"
  }
}

$BuildId = [guid]::NewGuid().ToString('N')
$BuildRoot = Join-Path $env:TEMP "taluo-source-$BuildId"
$SourceZip = Join-Path $env:TEMP "taluo-source-$BuildId.zip"
$SourceUrl = "https://github.com/lydia20031020-prog/taluo/archive/refs/heads/$SourceRef.zip"
Download-File $SourceUrl $SourceZip
Expand-Archive -Path $SourceZip -DestinationPath $BuildRoot -Force
$SourceDir = Get-ChildItem -Path $BuildRoot -Directory | Select-Object -First 1
if (-not $SourceDir) { throw '无法找到塔罗项目源代码目录。' }

Push-Location $SourceDir.FullName
try {
  & $PnpmExe install --no-frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw '前端依赖安装失败。' }
  $env:TARO_APP_PUBLIC_PATH = '/'
  $env:TARO_APP_CUSTOM_DOMAIN = 'www.taluo.lydiaowo.com'
  $env:TARO_APP_AI_API_URL = 'https://api.taluo.lydiaowo.com'
  $env:TARO_APP_SUPABASE_URL = ''
  $env:TARO_APP_SUPABASE_ANON_KEY = ''
  $env:TARO_APP_APP_ID = 'taluo-h5'
  & $PnpmExe build:h5:production
  if ($LASTEXITCODE -ne 0) { throw 'H5 生产构建失败。' }
  & $NodeExe scripts/preparePages.mjs
  if ($LASTEXITCODE -ne 0) { throw 'GitHub Pages 文件准备失败。' }
  if (-not (Test-Path (Join-Path $SourceDir.FullName 'dist\index.html'))) {
    throw '构建完成但找不到 dist\index.html。'
  }
  $DistDir = Join-Path $SourceDir.FullName 'dist'
}
finally {
  Pop-Location
}

& robocopy $DistDir $SiteDir /MIR /R:2 /W:2 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -gt 7) { throw "网站文件复制失败，robocopy exit code=$LASTEXITCODE。" }
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
    throw "Caddy 配置校验失败，已恢复备份：$backup"
  }
  & $CaddyExe reload --config $CaddyFile --adapter caddyfile
  if ($LASTEXITCODE -ne 0) {
    Copy-Item $backup $CaddyFile -Force
    & $CaddyExe reload --config $CaddyFile --adapter caddyfile
    throw "Caddy 重新加载失败，已恢复备份：$backup"
  }
}

Write-Host "完成：www.taluo.lydiaowo.com 网站文件已部署到 $SiteDir。"
Write-Host "完成：TaluoAI 使用 127.0.0.1:8790；现有 wbti 配置未被替换。"
Write-Host "下一步：在 C:\taluo-ai\.env 填入新的 DeepSeek API Key，然后重新运行 TaluoAI 计划任务。"
