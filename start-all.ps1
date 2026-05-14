# OriginBi Technical - Start All Services Script

# Automatically navigate to the directory where this script is located
Set-Location -Path $PSScriptRoot
Write-Host "Set root directory to: $PSScriptRoot" -ForegroundColor Yellow

Write-Host "Starting all OriginBi Technical services..." -ForegroundColor Green

function Start-ServiceWindow {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string]$RelativePath,

        [Parameter(Mandatory = $true)]
        [string]$Command,

        [string]$Port
    )

    $fullPath = Join-Path $PSScriptRoot $RelativePath

    if (-not (Test-Path $fullPath)) {
        Write-Warning "Directory not found for ${Name}: $fullPath"
        return
    }

    $windowTitle = "OriginBi Technical - $Name"
    $escapedPath = $fullPath.Replace("'", "''")
    $escapedWindowTitle = $windowTitle.Replace("'", "''")
    $launchCommand = "`$host.UI.RawUI.WindowTitle = '$escapedWindowTitle'; Set-Location '$escapedPath'; $Command"
    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($launchCommand))

    Start-Process powershell -ArgumentList "-NoExit", "-EncodedCommand", $encodedCommand

    $message = "Launched $Name"
    if ($Port) {
        $message += " (Port $Port)"
    }
    Write-Host "$message..."
}

# 1. Judge0 code execution sandbox (Port 2358)
$judge0Path = Join-Path $PSScriptRoot "backend/judge0"
$judge0ComposePath = Join-Path $judge0Path "docker-compose.yml"

if (Test-Path $judge0ComposePath) {
    Write-Host "--- Starting Judge0 (Port 2358) ---" -ForegroundColor Yellow
    Push-Location $judge0Path
    docker compose up -d
    $judge0ExitCode = $LASTEXITCODE
    Pop-Location

    if ($judge0ExitCode -eq 0) {
        Write-Host "Launched Judge0..."
    } else {
        Write-Warning "Judge0 docker compose exited with code $judge0ExitCode. Check Docker Desktop and backend/judge0/judge0.conf."
    }
} else {
    Write-Warning "Judge0 docker-compose.yml not found at: $judge0ComposePath"
}

# 2. Assessment Service (NestJS) (Port 5000)
Start-ServiceWindow `
    -Name "Assessment Service" `
    -RelativePath "backend/assessment-service" `
    -Command "npm run start:dev" `
    -Port "5000"

# 3. Exam Engine (Go) (Port 8088)
Start-ServiceWindow `
    -Name "Exam Engine" `
    -RelativePath "backend/exam-engine" `
    -Command "go run ./cmd/server" `
    -Port "8088"

# 4. Tech Assessment Engine (Go) (Port 5001)
# Load the same local DB settings as assessment-service, then force a non-conflicting port.
$techAssessmentCommand = 'if (Test-Path "..\assessment-service\.env.local") { Get-Content "..\assessment-service\.env.local" | ForEach-Object { if ($_ -match "^\s*([^#][^=]+)=(.*)$") { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2], "Process") } } }; $env:TECH_ENGINE_PORT = "5001"; go run ./cmd/api'
Start-ServiceWindow `
    -Name "Tech Assessment Engine" `
    -RelativePath "backend/tech-assessment-engine" `
    -Command $techAssessmentCommand `
    -Port "5001"

# 5. Frontend (Port 3000)
# We add a small delay to let backend services initialize.
Start-Sleep -Seconds 5
Start-ServiceWindow `
    -Name "Frontend" `
    -RelativePath "frontend" `
    -Command "npm run dev" `
    -Port "3000"

Write-Host "All OriginBi Technical services started! You can close the original terminal if you wish." -ForegroundColor Cyan
