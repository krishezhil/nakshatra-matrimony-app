# PKG Build Script for Nakshatra Matrimony Application
param(
    [switch]$Debug,
    [string]$OutputDir = "dist"
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "        PKG BUILD SCRIPT v1.0.2               " -ForegroundColor Cyan
Write-Host "  Nakshatra Matrimony Platform Builder        " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Validate environment
Write-Host "[1/6] Validating build environment..." -ForegroundColor Blue
if (-not (Test-Path "../package.json")) {
    Write-Host "[ERROR] package.json not found!" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "../index.js")) {
    Write-Host "[ERROR] index.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Environment validation passed" -ForegroundColor Green

# Step 2: Stop processes
Write-Host "[2/6] Stopping running processes..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "chrome" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Processes stopped" -ForegroundColor Green

# Step 3: Update versions
Write-Host "[3/6] Updating version references..." -ForegroundColor Blue
& node ../utils/update-version.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Version update failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Version references updated" -ForegroundColor Green

# Step 4: Prepare output
Write-Host "[4/6] Preparing output directory..." -ForegroundColor Blue
$OutputDir = "../$OutputDir"
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
Remove-Item -Path "$OutputDir\nakshatra-matrimony-win64.exe" -Force -ErrorAction SilentlyContinue
Write-Host "[OK] Output directory ready" -ForegroundColor Green

# Step 5: Build executable
Write-Host "[5/6] Building PKG executable..." -ForegroundColor Blue
$exePath = "$OutputDir/nakshatra-matrimony-win64.exe"
$startTime = Get-Date

if ($Debug) {
    & npx pkg .. --target node18-win-x64 --output $exePath --debug
} else {
    & npx pkg .. --target node18-win-x64 --output $exePath
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] PKG build failed" -ForegroundColor Red
    exit 1
}

$endTime = Get-Date
$duration = [math]::Round(($endTime - $startTime).TotalSeconds, 1)
Write-Host "[OK] PKG build completed in $duration seconds" -ForegroundColor Green

# Step 6: Validate result
Write-Host "[6/6] Validating executable..." -ForegroundColor Blue
if (-not (Test-Path $exePath)) {
    Write-Host "[ERROR] Executable not found" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $exePath
$sizeInMB = [math]::Round($fileInfo.Length / 1MB, 1)

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "        BUILD COMPLETED SUCCESSFULLY!         " -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Executable: $exePath" -ForegroundColor Green
Write-Host "Size: $sizeInMB MB" -ForegroundColor Green
Write-Host "Duration: $duration seconds" -ForegroundColor Green
Write-Host "Built: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host ""
Write-Host "Ready for deployment!" -ForegroundColor Green