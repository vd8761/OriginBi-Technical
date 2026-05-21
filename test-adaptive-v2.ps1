# Adaptive Engine v2 - Quick Test Script
# PowerShell script to test all adaptive v2 endpoints

$baseUrl = "http://localhost:3001"
$apiBase = "$baseUrl/api/adaptive/v2"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Adaptive Engine v2 - Quick Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "[1/7] Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "✅ Health check passed - All tables ready" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Health check degraded: $($response.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    Write-Host "   Make sure backend is running on port 3001" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Refresh/Verify Blueprint (auto-built from question bank — no manual setup needed)
Write-Host "[2/7] Refreshing Blueprint for Assessment 1..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/blueprint/1/refresh" -Method Post -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Blueprint refreshed successfully" -ForegroundColor Green
        Write-Host "   Total Marks: $($response.blueprint.totalMarks)" -ForegroundColor Gray
        Write-Host "   Marks per Block: $($response.blueprint.marksPerBlock)" -ForegroundColor Gray
        Write-Host "   Categories: $($response.blueprint.categoryBlueprint.Count)" -ForegroundColor Gray
    }
} catch {
    # Blueprint refresh may fail if assessment has no questions yet — that's OK
    # The blueprint will be auto-built when the first block is generated
    Write-Host "⚠️  Blueprint refresh skipped (will auto-build on first block generation): $_" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Get Blueprint
Write-Host "[3/7] Retrieving Blueprint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/blueprint/1" -Method Get
    if ($response.success) {
        Write-Host "✅ Blueprint retrieved successfully" -ForegroundColor Green
        Write-Host "   Categories: $($response.blueprint.categoryBlueprint.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to retrieve blueprint: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Generate Block 1
Write-Host "[4/7] Generating Block 1..." -ForegroundColor Yellow
$attemptToken = "test-ps-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$generateBody = @{
    assessmentId = 1
    blockNumber = 1
    userId = 1
    mode = "main"
    attemptToken = $attemptToken
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$apiBase/block/generate" -Method Post -Body $generateBody -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Block 1 generated successfully" -ForegroundColor Green
        Write-Host "   Difficulty: $($response.block.difficulty)" -ForegroundColor Gray
        Write-Host "   Questions: $($response.block.questions.Count)" -ForegroundColor Gray
        Write-Host "   Total Marks: $($response.block.totalBlockMarks)" -ForegroundColor Gray
        Write-Host "   Attempt Token: $attemptToken" -ForegroundColor Gray
        
        # Save first question ID for answer test
        $global:firstQuestionId = $response.block.questions[0].id
        $global:firstOptionId = $response.block.questions[0].options[0].id
    }
} catch {
    Write-Host "❌ Block generation failed: $_" -ForegroundColor Red
    Write-Host "   This might mean:" -ForegroundColor Red
    Write-Host "   - No questions in database for assessment 1" -ForegroundColor Red
    Write-Host "   - Questions not marked as active" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 5: Complete Block 1 (Write Snapshot)
Write-Host "[5/7] Completing Block 1 (writing snapshot)..." -ForegroundColor Yellow
$completeBody = @{
    attemptToken = $attemptToken
    blockNumber = 1
    timeTaken = 600
    answers = @{
        $global:firstQuestionId = $global:firstOptionId
    }
    questionTiming = @{
        $global:firstQuestionId = 120
    }
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$apiBase/block/complete" -Method Post -Body $completeBody -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ Block 1 completed successfully" -ForegroundColor Green
        Write-Host "   Snapshot Taken: $(-not $response.alreadySnapshotted)" -ForegroundColor Gray
        Write-Host "   Next Difficulty: $($response.nextBlockDifficulty)" -ForegroundColor Gray
        Write-Host "   Marks Score: $($response.blockMetrics.marksScore)%" -ForegroundColor Gray
        Write-Host "   Block Readiness: $($response.blockMetrics.blockReadinessScore)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Block completion failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Get Block Status
Write-Host "[6/7] Getting Attempt Status..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/status/$attemptToken" -Method Get
    if ($response.success) {
        Write-Host "✅ Status retrieved successfully" -ForegroundColor Green
        Write-Host "   Current Block: $($response.currentBlock)" -ForegroundColor Gray
        Write-Host "   Adaptive Path: $($response.adaptivePath -join ' → ')" -ForegroundColor Gray
        Write-Host "   Blocks Completed: $($response.blocks | Where-Object { $_.snapshotTaken } | Measure-Object).Count" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Status retrieval failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get Block Questions (for navigation back)
Write-Host "[7/7] Testing Block Navigation..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiBase/block/$attemptToken/1" -Method Get
    if ($response.success) {
        Write-Host "✅ Block questions retrieved successfully" -ForegroundColor Green
        Write-Host "   Questions: $($response.questions.Count)" -ForegroundColor Gray
        Write-Host "   Snapshot Taken: $($response.snapshotTaken)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Block retrieval failed: $_" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Attempt Token: $attemptToken" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open frontend: http://localhost:3000/assessment/aptitude/adaptive?v2=true&assessmentId=1&attemptToken=$attemptToken" -ForegroundColor Gray
Write-Host "2. Complete remaining blocks (2, 3, 4)" -ForegroundColor Gray
Write-Host "3. Submit assessment to see final report" -ForegroundColor Gray
Write-Host ""
Write-Host "To view full test guide, see: TEST_ADAPTIVE_V2.md" -ForegroundColor Cyan
Write-Host ""
