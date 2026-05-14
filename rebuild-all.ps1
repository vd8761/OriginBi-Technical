# OriginBi Technical - Clean and Rebuild Script

# Set the root directory to the script's location
Set-Location -Path $PSScriptRoot
Write-Host "Starting full clean and rebuild from: $PSScriptRoot" -ForegroundColor Cyan

# Define all Node.js directories relative to the script location
$nodeDirectories = @(
    "frontend",
    "backend",
    "backend/shared",
    "backend/assessment-service"
)

foreach ($dir in $nodeDirectories) {
    $fullPath = Join-Path $PSScriptRoot $dir

    if (Test-Path $fullPath) {
        $resolvedFullPath = (Resolve-Path $fullPath).Path
        Write-Host "--- Processing Node directory: $dir ---" -ForegroundColor Yellow

        $modulePath = Join-Path $fullPath "node_modules"
        if (Test-Path $modulePath) {
            $resolvedModulePath = (Resolve-Path $modulePath).Path

            if ((Split-Path -Leaf $resolvedModulePath) -eq "node_modules" -and $resolvedModulePath.StartsWith($resolvedFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
                Write-Host "Removing node_modules in $dir..."
                Remove-Item -LiteralPath $resolvedModulePath -Recurse -Force -ErrorAction SilentlyContinue
            } else {
                Write-Warning "Skipping unsafe node_modules path: $resolvedModulePath"
            }
        }

        Write-Host "Running npm install in $dir..." -ForegroundColor Gray
        Push-Location $fullPath
        npm install
        $npmExitCode = $LASTEXITCODE
        Pop-Location

        if ($npmExitCode -ne 0) {
            Write-Warning "npm install failed in $dir with exit code $npmExitCode."
        }
    } else {
        Write-Warning "Directory not found: $fullPath"
    }
}

# Build the shared library used by backend services
Write-Host "--- Building Backend Shared Library ---" -ForegroundColor Yellow
$sharedPath = Join-Path $PSScriptRoot "backend/shared"

if (Test-Path $sharedPath) {
    Push-Location $sharedPath
    npm run build
    $sharedBuildExitCode = $LASTEXITCODE
    Pop-Location

    if ($sharedBuildExitCode -eq 0) {
        Write-Host "Shared library build complete!" -ForegroundColor Green
    } else {
        Write-Warning "Shared library build failed with exit code $sharedBuildExitCode."
    }
} else {
    Write-Error "Could not find $sharedPath to run build."
}

# Refresh Go module dependencies for Go services
$goDirectories = @(
    "backend/exam-engine",
    "backend/tech-assessment-engine"
)

foreach ($dir in $goDirectories) {
    $fullPath = Join-Path $PSScriptRoot $dir
    $goModPath = Join-Path $fullPath "go.mod"

    if (Test-Path $goModPath) {
        Write-Host "--- Processing Go directory: $dir ---" -ForegroundColor Yellow

        Push-Location $fullPath
        Write-Host "Cleaning Go build cache in $dir..." -ForegroundColor Gray
        go clean -cache

        Write-Host "Downloading Go modules in $dir..." -ForegroundColor Gray
        go mod download
        $goExitCode = $LASTEXITCODE
        Pop-Location

        if ($goExitCode -ne 0) {
            Write-Warning "go mod download failed in $dir with exit code $goExitCode."
        }
    } else {
        Write-Warning "go.mod not found: $goModPath"
    }
}

Write-Host "Rebuild Process Finished!" -ForegroundColor Green
