# Client Package Builder with Configurable Names and Versions
# Creates professional client delivery packages

param(
    [string]$AppName = "NakshatraMatrimony",
    [string]$Version = ""
)

# Get version from package.json if not provided
if (-not $Version) {
    $packageFile = "..\package.json"
    $Version = "1.0.0"  # Default
    
    if (Test-Path $packageFile) {
        $content = Get-Content $packageFile -Raw | ConvertFrom-Json
        $Version = $content.version
    }
}

# Configuration
$executableName = "$AppName-v$Version"
$packageName = "..\dist\${AppName}_v${Version}_ClientPackage"
$packageDate = Get-Date -Format "yyyy-MM-dd"

# Ensure dist directory exists
if (-not (Test-Path "..\dist")) {
    New-Item -Path "..\dist" -ItemType Directory -Force | Out-Null
}

Write-Host "=== $AppName Client Package Builder ===" -ForegroundColor Green
Write-Host "Version: $Version" -ForegroundColor Cyan
Write-Host "Package: $packageName" -ForegroundColor Cyan
Write-Host "Date: $packageDate" -ForegroundColor Cyan
Write-Host ""

# Create directories
Write-Host "Creating package structure..." -ForegroundColor Yellow

New-Item -Path $packageName -ItemType Directory -Force | Out-Null

# Copy Windows executable
Write-Host "Copying executable..." -ForegroundColor Yellow
if (Test-Path "..\dist\nakshatra-matrimony-win64.exe") {
    $targetExe = "$packageName\$executableName.exe"
    Copy-Item "..\dist\nakshatra-matrimony-win64.exe" $targetExe
    $size = [math]::Round((Get-Item $targetExe).Length / 1MB, 1)
    Write-Host "  Windows executable: $executableName.exe ($size MB)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: ..\dist\nakshatra-matrimony-win64.exe not found" -ForegroundColor Red
}

# Copy documentation
Write-Host "Copying documentation..." -ForegroundColor Yellow

# Copy PDF user manual instead of markdown files
if (Test-Path "..\\doc\\USER_MANUAL_Professional.pdf") {
    Copy-Item "..\\doc\\USER_MANUAL_Professional.pdf" $packageName
    Write-Host "  Copied: USER_MANUAL_Professional.pdf" -ForegroundColor Green
} else {
    Write-Host "  WARNING: USER_MANUAL_Professional.pdf not found in doc folder" -ForegroundColor Red
}

# Create support info
$supportText = @"
$AppName Platform v$Version - Support Information

Package Date: $packageDate
Executable: $executableName.exe

Log Files Path - %appdata%/matrimony/logs
"@

$supportText | Out-File "$packageName\SUPPORT_INFO.txt" -Encoding UTF8

# Create ZIP archive
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
$zipPath = "$packageName.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path $packageName -DestinationPath $zipPath -CompressionLevel Optimal
$zipName = Split-Path $zipPath -Leaf
Write-Host "  ZIP created: $zipName" -ForegroundColor Green

# Final summary
Write-Host ""
Write-Host "=== Package Created Successfully ===" -ForegroundColor Green
Write-Host "Location: $packageName" -ForegroundColor Cyan
Write-Host "ZIP Archive: $zipName" -ForegroundColor Cyan
Write-Host "Executable: $executableName.exe" -ForegroundColor Cyan

if (Test-Path $packageName) {
    $totalSize = (Get-ChildItem $packageName -Recurse | Measure-Object Length -Sum).Sum
    $totalMB = [math]::Round($totalSize / 1MB, 1)
    Write-Host "Total Size: $totalMB MB" -ForegroundColor Cyan
}

if (Test-Path $zipPath) {
    $zipSize = (Get-Item $zipPath).Length
    $zipMB = [math]::Round($zipSize / 1MB, 1)
    Write-Host "ZIP Size: $zipMB MB" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Ready for client delivery!" -ForegroundColor Green