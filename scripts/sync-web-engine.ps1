#Requires -Version 5.1
<#
.SYNOPSIS
    Syncs the Praxis Play web game engine and assets from mktg_bivariate_tools
    into the PraxisPlay-iOS app bundle (PraxisPlay/Resources/WebEngine).
#>
param(
    [string]$SourceRepo = (Join-Path $PSScriptRoot "..\..\mktg_bivariate_tools"),
    [string]$TargetDir  = (Join-Path $PSScriptRoot "..\PraxisPlay\Resources\WebEngine")
)

$ErrorActionPreference = "Stop"
$SourceRepo = [System.IO.Path]::GetFullPath($SourceRepo)
$TargetDir  = [System.IO.Path]::GetFullPath($TargetDir)

if (-not (Test-Path $SourceRepo)) {
    throw "Source repository not found at: $SourceRepo"
}

Write-Host "🔄 Syncing Praxis Play WebEngine from $SourceRepo..." -ForegroundColor Cyan

# Ensure target subdirectories exist matching relative paths expected by game-play.html
$gamesTarget  = Join-Path $TargetDir "admin_pages\games"
$jsTarget     = Join-Path $gamesTarget "js"
$snapTarget   = Join-Path $gamesTarget "dev_data\snapshots"
$sharedCss    = Join-Path $TargetDir "shared\css"
$sharedJs     = Join-Path $TargetDir "shared\js"
$svgLogos     = Join-Path $TargetDir "art_assets\svg_logos"

foreach ($dir in @($gamesTarget, $jsTarget, $snapTarget, $sharedCss, $sharedJs, $svgLogos)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# 1. Copy HTML controller pages
Copy-Item -Path (Join-Path $SourceRepo "admin_pages\games\game-play.html") -Destination $gamesTarget -Force
Copy-Item -Path (Join-Path $SourceRepo "admin_pages\games\game-join.html") -Destination $gamesTarget -Force

# 2. Copy student game JS modules (exclude host question config)
Get-ChildItem -Path (Join-Path $SourceRepo "admin_pages\games\js\*.js") | Where-Object { $_.Name -ne "game-question-config.js" } | Copy-Item -Destination $jsTarget -Force

# 3. Copy all dev_data snapshots for Solo Practice / Arcade Mode
Copy-Item -Path (Join-Path $SourceRepo "admin_pages\games\dev_data\snapshots\*.json") -Destination $snapTarget -Force

# 4. Copy only the 2 shared CSS files used by game-play.html (keep iOS-enhanced api-config.js)
Copy-Item -Path (Join-Path $SourceRepo "shared\css\main.css") -Destination $sharedCss -Force
Copy-Item -Path (Join-Path $SourceRepo "shared\css\badge-notification.css") -Destination $sharedCss -Force
if (Test-Path (Join-Path $SourceRepo "shared\js\error_utils.js")) {
    Copy-Item -Path (Join-Path $SourceRepo "shared\js\error_utils.js") -Destination $sharedJs -Force
}
if (Test-Path (Join-Path $SourceRepo "shared\js\badge-notifications.js")) {
    Copy-Item -Path (Join-Path $SourceRepo "shared\js\badge-notifications.js") -Destination $sharedJs -Force
}

# 5. Copy Praxis Play SVG logos
Copy-Item -Path (Join-Path $SourceRepo "art_assets\svg_logos\*.svg") -Destination $svgLogos -Force

$jsCount   = (Get-ChildItem $jsTarget -Filter "*.js").Count
$snapCount = (Get-ChildItem $snapTarget -Filter "*.json").Count
Write-Host "✅ Synced $jsCount game JS modules and $snapCount snapshots into PraxisPlay/Resources/WebEngine!" -ForegroundColor Green
