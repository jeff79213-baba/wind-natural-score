# Wind Natural Score - Auto refresh script
# Called by Windows Task Scheduler every Monday 07:00
# Steps: re-screenshot -> rebuild metadata -> deploy Firebase -> sync GitHub Pages
# Log: logs\auto-refresh.log

$ErrorActionPreference = 'Continue'
$ProjectDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectDir 'logs'
$LogFile = Join-Path $LogDir 'auto-refresh.log'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"[$stamp] AUTO-REFRESH START" | Out-File -FilePath $LogFile -Append -Encoding utf8

Set-Location $ProjectDir

"[$stamp] step1: npm run refresh" | Out-File -FilePath $LogFile -Append -Encoding utf8
$out = & npm run refresh 2>&1
$out | Out-File -FilePath $LogFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) {
  "[$stamp] ERROR: npm run refresh failed (exit=$LASTEXITCODE)" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

"[$stamp] step2: firebase deploy" | Out-File -FilePath $LogFile -Append -Encoding utf8
$out = & firebase deploy --only hosting --project opencode-sk 2>&1
$out | Out-File -FilePath $LogFile -Append -Encoding utf8
$fireExit = $LASTEXITCODE

"[$stamp] step3: git sync" | Out-File -FilePath $LogFile -Append -Encoding utf8
& git add -A 2>&1 | Out-File -FilePath $LogFile -Append -Encoding utf8
& git diff --cached --quiet
$hasChange = ($LASTEXITCODE -ne 0)
if ($hasChange) {
  & git commit -m "weekly auto score refresh" 2>&1 | Out-File -FilePath $LogFile -Append -Encoding utf8
  & git push origin master 2>&1 | Out-File -FilePath $LogFile -Append -Encoding utf8
} else {
  "[$stamp] no changes, skip commit/push" | Out-File -FilePath $LogFile -Append -Encoding utf8
}

$end = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"[$end] AUTO-REFRESH DONE (firebase exit=$fireExit)" | Out-File -FilePath $LogFile -Append -Encoding utf8
