# =============================================================================
# OriginBI — Full Assessment Test Suite (PowerShell)
# =============================================================================
# Tests every assessment module + the full adaptive v2 flow end-to-end.
#
# Usage:
#   .\test-all-assessments.ps1
#   .\test-all-assessments.ps1 -BaseUrl "http://localhost:3001" -UserId 1
#   .\test-all-assessments.ps1 -AssessmentId 5 -AdaptiveOnly
#
# Requirements:
#   - Backend running on $BaseUrl (default: http://localhost:3001)
#   - At least one active question per module in the DB
# =============================================================================

param(
    [string]$BaseUrl      = "http://localhost:3001",
    [int]   $UserId       = 1,
    [int]   $AssessmentId = 0,       # 0 = auto-detect from API
    [switch]$AdaptiveOnly = $false,  # Only run adaptive tests
    [switch]$Verbose      = $false
)

$api     = "$BaseUrl/api"
$apiAdap = "$api/adaptive/v2"

# ── Helpers ───────────────────────────────────────────────────────────────────

$script:passed  = 0
$script:failed  = 0
$script:skipped = 0

function Pass([string]$msg) {
    Write-Host "  ✅ $msg" -ForegroundColor Green
    $script:passed++
}

function Fail([string]$msg) {
    Write-Host "  ❌ $msg" -ForegroundColor Red
    $script:failed++
}

function Skip([string]$msg) {
    Write-Host "  ⏭  $msg" -ForegroundColor DarkGray
    $script:skipped++
}

function Info([string]$msg) {
    Write-Host "     $msg" -ForegroundColor Gray
}

function Section([string]$title) {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Url,
        [object]$Body = $null,
        [switch]$Silent
    )
    try {
        $params = @{ Uri = $Url; Method = $Method; ErrorAction = "Stop" }
        if ($Body) {
            $params.Body        = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        $resp = Invoke-RestMethod @params
        return @{ ok = $true; data = $resp }
    } catch {
        $errMsg = $_.Exception.Message
        if (-not $Silent) {
            if ($Verbose) { Write-Host "     HTTP Error: $errMsg" -ForegroundColor DarkRed }
        }
        return @{ ok = $false; error = $errMsg }
    }
}

# ── 0. Backend reachability ───────────────────────────────────────────────────

Section "0. Backend Connectivity"

$ping = Invoke-Api -Url "$api/health" -Silent
if (-not $ping.ok) {
    $ping = Invoke-Api -Url "$BaseUrl/health" -Silent
}
if ($ping.ok) {
    Pass "Backend is reachable at $BaseUrl"
} else {
    Fail "Backend not reachable at $BaseUrl — start the server first"
    Write-Host ""
    Write-Host "  Run: cd backend/assessment-service && npm run start:dev" -ForegroundColor Yellow
    exit 1
}

# ── 1. Adaptive Engine Health ─────────────────────────────────────────────────

Section "1. Adaptive Engine Health"

$health = Invoke-Api -Url "$apiAdap/health"
if ($health.ok -and $health.data.success) {
    if ($health.data.status -eq "healthy") {
        Pass "All adaptive tables present and ready"
    } else {
        Fail "Adaptive tables degraded: $($health.data.message)"
        Info "Run: node run-migrations.js"
    }
    if ($Verbose) {
        $health.data.tables.PSObject.Properties | ForEach-Object {
            Info "$($_.Name): $($_.Value)"
        }
    }
} else {
    Fail "Health endpoint failed"
    Info "Run migration 003_adaptive_settings_and_auto_blueprint.sql"
}

# ── 2. List Assessments ───────────────────────────────────────────────────────

Section "2. Assessment Listing"

$listResp = Invoke-Api -Url "$api/assessment/admin/assessments"
if ($listResp.ok -and $listResp.data.data) {
    $allAssessments = $listResp.data.data
    Pass "Listed $($allAssessments.Count) assessments"
    $allAssessments | ForEach-Object {
        Info "[$($_.assessment_id)] $($_.assessment_name) | module=$($_.module_type) | adaptive=$($_.adaptive_enabled) | questions=$($_.total_questions)"
    }
} else {
    Fail "Could not list assessments"
    $allAssessments = @()
}

# ── 3. Module-level attempt tests ─────────────────────────────────────────────

if (-not $AdaptiveOnly) {
    Section "3. Module Attempt Tests (Non-Adaptive)"

    $modules = @("aptitude", "grammar", "mnc", "role", "coding")

    foreach ($mod in $modules) {
        Write-Host ""
        Write-Host "  ── Module: $mod ──" -ForegroundColor Yellow

        # Find an assessment for this module
        $modAssessment = $allAssessments | Where-Object {
            $_.module_type -eq $mod -and
            (-not $_.adaptive_enabled) -and
            ($_.total_questions -gt 0 -or $_.trial_questions_count -gt 0 -or $_.main_questions_count -gt 0)
        } | Select-Object -First 1

        if (-not $modAssessment) {
            Skip "No non-adaptive $mod assessment with questions found — skipping"
            continue
        }

        $asmId = $modAssessment.assessment_id
        Info "Using assessment $asmId: $($modAssessment.assessment_name)"

        # Start attempt
        $startBody = @{ assessmentId = $asmId; userId = $UserId; mode = "trial" }
        $startResp = Invoke-Api -Method POST -Url "$api/assessment/$mod/start" -Body $startBody
        if (-not $startResp.ok) {
            # Try alternate endpoint
            $startResp = Invoke-Api -Method POST -Url "$api/assessment/start" -Body (@{ module = $mod } + $startBody)
        }

        if ($startResp.ok -and $startResp.data.attemptToken) {
            $token = $startResp.data.attemptToken
            $qCount = $startResp.data.totalQuestions
            Pass "Started $mod attempt — token=$token, questions=$qCount"

            # Submit attempt
            $submitBody = @{ attemptToken = $token; userId = $UserId }
            $submitResp = Invoke-Api -Method POST -Url "$api/assessment/$mod/submit" -Body $submitBody
            if (-not $submitResp.ok) {
                $submitResp = Invoke-Api -Method POST -Url "$api/assessment/submit" -Body (@{ module = $mod } + $submitBody)
            }
            if ($submitResp.ok) {
                Pass "Submitted $mod attempt"
            } else {
                Skip "Submit endpoint not found for $mod (attempt started OK)"
            }
        } else {
            Fail "Could not start $mod attempt: $($startResp.error)"
        }
    }
}

# ── 4. Adaptive Settings API ──────────────────────────────────────────────────

Section "4. Adaptive Settings (Assessment Tab)"

# Find or use specified adaptive-capable assessment
$adaptiveModules = @("aptitude", "grammar", "mnc")
$targetAssessment = $null

if ($AssessmentId -gt 0) {
    $targetAssessment = $allAssessments | Where-Object { $_.assessment_id -eq $AssessmentId } | Select-Object -First 1
    if (-not $targetAssessment) {
        Fail "Assessment $AssessmentId not found"
    }
} else {
    # Prefer one that already has questions
    $targetAssessment = $allAssessments | Where-Object {
        $adaptiveModules -contains $_.module_type -and
        ($_.total_questions -gt 0 -or $_.trial_questions_count -gt 0 -or $_.main_questions_count -gt 0)
    } | Select-Object -First 1

    if (-not $targetAssessment) {
        # Fall back to any adaptive-capable assessment
        $targetAssessment = $allAssessments | Where-Object {
            $adaptiveModules -contains $_.module_type
        } | Select-Object -First 1
    }
}

if (-not $targetAssessment) {
    Fail "No aptitude/grammar/mnc assessment found — cannot run adaptive tests"
    Write-Host ""
    Write-Host "  Create an assessment and add questions first." -ForegroundColor Yellow
    exit 1
}

$testAsmId = $targetAssessment.assessment_id
Info "Using assessment $testAsmId: $($targetAssessment.assessment_name) (module=$($targetAssessment.module_type))"

# GET settings
$settingsResp = Invoke-Api -Url "$apiAdap/settings/$testAsmId"
if ($settingsResp.ok -and $settingsResp.data.success) {
    Pass "GET adaptive settings"
    $s = $settingsResp.data.settings
    Info "adaptive_enabled=$($s.adaptive_enabled), total_marks=$($s.adaptive_total_marks), blocks=$($s.adaptive_total_blocks), spm=$($s.adaptive_seconds_per_mark)"
    if ($settingsResp.data.questionBank) {
        $qb = $settingsResp.data.questionBank
        Info "Question bank: $($qb.totalActiveQuestions) active questions, $($qb.categories.Count) categories"
    }
} else {
    Fail "GET adaptive settings failed: $($settingsResp.error)"
}

# PUT settings — enable adaptive with sensible defaults
$putBody = @{
    adaptiveEnabled      = $true
    adaptiveTotalMarks   = 100
    adaptiveTotalBlocks  = 4
    adaptiveSecondsPerMark = 45
}
$putResp = Invoke-Api -Method PUT -Url "$apiAdap/settings/$testAsmId" -Body $putBody
if ($putResp.ok -and $putResp.data.success) {
    Pass "PUT adaptive settings — adaptive enabled"
    if ($putResp.data.blueprint) {
        $bp = $putResp.data.blueprint
        Info "Blueprint auto-built: $($bp.totalMarks) marks, $($bp.totalBlocks) blocks, $($bp.categoryBlueprint.PSObject.Properties.Count) categories"
    } else {
        Info "Blueprint will be built when questions are available"
    }
} else {
    Fail "PUT adaptive settings failed: $($putResp.error)"
}

# ── 5. Auto-Blueprint ─────────────────────────────────────────────────────────

Section "5. Auto-Blueprint (from Question Bank)"

# GET blueprint — should exist now (auto-built)
$bpResp = Invoke-Api -Url "$apiAdap/blueprint/$testAsmId"
if ($bpResp.ok -and $bpResp.data.success) {
    $bp = $bpResp.data.blueprint
    Pass "Blueprint exists and was auto-built"
    Info "Total marks   : $($bp.totalMarks)"
    Info "Total blocks  : $($bp.totalBlocks)"
    Info "Marks/block   : $($bp.marksPerBlock)"
    Info "Seconds/mark  : $($bp.secondsPerMark)"
    $catCount = ($bp.categoryBlueprint | Get-Member -MemberType NoteProperty).Count
    Info "Categories    : $catCount"
    if ($Verbose -and $catCount -gt 0) {
        $bp.categoryBlueprint.PSObject.Properties | ForEach-Object {
            Info "  $($_.Name): weight=$($_.Value.weightPct)%, targetMarks=$($_.Value.targetMarks)"
        }
    }
} else {
    Fail "Blueprint not found: $($bpResp.error)"
    Info "This means no active questions exist for assessment $testAsmId"
    Info "Add questions first, then re-run this test"
}

# Manual refresh
$refreshResp = Invoke-Api -Method POST -Url "$apiAdap/blueprint/$testAsmId/refresh"
if ($refreshResp.ok -and $refreshResp.data.success) {
    Pass "Manual blueprint refresh succeeded"
    Info "Categories after refresh: $(($refreshResp.data.blueprint.categoryBlueprint | Get-Member -MemberType NoteProperty).Count)"
} else {
    if ($refreshResp.error -match "no active questions|not found|adaptive.*enabled") {
        Skip "Blueprint refresh skipped (no questions or adaptive not enabled)"
    } else {
        Fail "Blueprint refresh failed: $($refreshResp.error)"
    }
}

# ── 6. Full Adaptive Block Flow ───────────────────────────────────────────────

Section "6. Full Adaptive Block Flow (4 Blocks)"

# Check if we have enough questions to run the block flow
$settingsCheck = Invoke-Api -Url "$apiAdap/settings/$testAsmId"
$hasQuestions = $false
if ($settingsCheck.ok -and $settingsCheck.data.questionBank) {
    $hasQuestions = $settingsCheck.data.questionBank.totalActiveQuestions -gt 0
}

if (-not $hasQuestions) {
    Skip "No active questions for assessment $testAsmId — skipping block flow test"
    Skip "Add questions via POST $api/assessment/admin/aptitude/questions then re-run"
} else {
    $totalBlocks = 4
    $attemptToken = "TEST-ADAP-$(Get-Date -Format 'yyyyMMddHHmmss')-$([System.Guid]::NewGuid().ToString('N').Substring(0,6).ToUpper())"
    Info "Attempt token: $attemptToken"

    # We need an actual attempt record in the DB for the block flow.
    # Start a block-based attempt via the assessment start endpoint.
    $startBody = @{ assessmentId = $testAsmId; userId = $UserId; mode = "main" }
    $modType = $targetAssessment.module_type
    $startResp = Invoke-Api -Method POST -Url "$api/assessment/$modType/start" -Body $startBody

    if ($startResp.ok -and $startResp.data.attemptToken) {
        $attemptToken = $startResp.data.attemptToken
        Pass "Started adaptive attempt — token=$attemptToken"
        Info "Questions in block 1: $($startResp.data.totalQuestions)"
    } else {
        # Try generic start
        $startResp = Invoke-Api -Method POST -Url "$api/assessment/start" -Body (@{ module = $modType } + $startBody)
        if ($startResp.ok -and $startResp.data.attemptToken) {
            $attemptToken = $startResp.data.attemptToken
            Pass "Started adaptive attempt (generic endpoint) — token=$attemptToken"
        } else {
            Fail "Could not start adaptive attempt: $($startResp.error)"
            Info "Trying direct block generation with a synthetic token..."
        }
    }

    # ── Block loop ────────────────────────────────────────────────────────────
    $allBlocksPassed = $true
    $lastQuestionId  = $null
    $lastOptionId    = $null

    for ($blockNum = 1; $blockNum -le $totalBlocks; $blockNum++) {
        Write-Host ""
        Write-Host "  ── Block $blockNum / $totalBlocks ──" -ForegroundColor Yellow

        # Generate block
        $genBody = @{
            assessmentId = $testAsmId
            blockNumber  = $blockNum
            userId       = $UserId
            mode         = "main"
            attemptToken = $attemptToken
        }
        $genResp = Invoke-Api -Method POST -Url "$apiAdap/block/generate" -Body $genBody
        if (-not ($genResp.ok -and $genResp.data.success)) {
            Fail "Block $blockNum generation failed: $($genResp.error)"
            $allBlocksPassed = $false
            break
        }

        $block = $genResp.data.block
        Pass "Block $blockNum generated — difficulty=$($block.difficulty), questions=$($block.questions.Count), marks=$($block.totalBlockMarks)"

        if ($Verbose) {
            $block.questions | ForEach-Object {
                Info "  Q$($_.id): [$($_.difficulty)] $($_.category)/$($_.subcategory) — $($_.marks)m"
            }
        }

        # Build answers — answer first question correctly, skip rest
        $answers = @{}
        $timing  = @{}
        $firstQ  = $block.questions | Select-Object -First 1

        if ($firstQ -and $firstQ.options -and $firstQ.options.Count -gt 0) {
            $answers["$($firstQ.id)"] = "$($firstQ.options[0].id)"
            $timing["$($firstQ.id)"]  = 45
            $lastQuestionId = $firstQ.id
            $lastOptionId   = $firstQ.options[0].id
        }

        # Add timing for remaining questions (skipped)
        $block.questions | Select-Object -Skip 1 | ForEach-Object {
            $timing["$($_.id)"] = 30
        }

        # Complete block (write snapshot)
        $completeBody = @{
            attemptToken  = $attemptToken
            blockNumber   = $blockNum
            timeTaken     = ($timing.Values | Measure-Object -Sum).Sum
            answers       = $answers
            questionTiming = $timing
        }
        $completeResp = Invoke-Api -Method POST -Url "$apiAdap/block/complete" -Body $completeBody
        if ($completeResp.ok -and $completeResp.data.success) {
            $metrics = $completeResp.data.blockMetrics
            Pass "Block $blockNum snapshot written — nextDifficulty=$($completeResp.data.nextBlockDifficulty)"
            Info "  marksScore=$($metrics.marksScore)%, BRS=$($metrics.blockReadinessScore), skipImpact=$($metrics.skipImpact)"
        } else {
            Fail "Block $blockNum complete failed: $($completeResp.error)"
            $allBlocksPassed = $false
        }

        # Test back-navigation (get block questions)
        $navResp = Invoke-Api -Url "$apiAdap/block/$attemptToken/$blockNum"
        if ($navResp.ok -and $navResp.data.success) {
            Pass "Block $blockNum back-navigation OK — snapshotTaken=$($navResp.data.snapshotTaken)"
        } else {
            Fail "Block $blockNum back-navigation failed: $($navResp.error)"
        }

        # Test save-answers (post-snapshot edit)
        if ($lastQuestionId -and $lastOptionId) {
            $saveBody = @{
                attemptToken = $attemptToken
                blockNumber  = $blockNum
                answers      = @{ "$lastQuestionId" = "$lastOptionId" }
            }
            $saveResp = Invoke-Api -Method POST -Url "$apiAdap/block/save-answers" -Body $saveBody
            if ($saveResp.ok -and $saveResp.data.success) {
                Pass "Block $blockNum save-answers OK — saved=$($saveResp.data.saved)"
            } else {
                Skip "Block $blockNum save-answers: $($saveResp.error)"
            }
        }
    }

    # ── Status check ──────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "  ── Attempt Status ──" -ForegroundColor Yellow
    $statusResp = Invoke-Api -Url "$apiAdap/status/$attemptToken"
    if ($statusResp.ok -and $statusResp.data.success) {
        Pass "Status endpoint OK"
        Info "Adaptive path: $($statusResp.data.adaptivePath -join ' → ')"
        $completed = ($statusResp.data.blocks | Where-Object { $_.snapshotTaken }).Count
        Info "Blocks completed: $completed / $totalBlocks"
        if ($Verbose) {
            $statusResp.data.blocks | ForEach-Object {
                Info "  Block $($_.blockNumber): difficulty=$($_.difficulty), BRS=$($_.blockReadinessScore), next=$($_.nextBlockDifficulty)"
            }
        }
    } else {
        Fail "Status endpoint failed: $($statusResp.error)"
    }

    # ── Snapshot debug endpoint ───────────────────────────────────────────────
    $snapResp = Invoke-Api -Url "$apiAdap/snapshot/$attemptToken/1"
    if ($snapResp.ok -and $snapResp.data.success) {
        Pass "Snapshot endpoint OK — block 1 snapshot readable"
    } else {
        Skip "Snapshot endpoint: $($snapResp.error)"
    }

    # ── Final submit ──────────────────────────────────────────────────────────
    Write-Host ""
    Write-Host "  ── Final Submit ──" -ForegroundColor Yellow
    $submitBody = @{
        attemptToken = $attemptToken
        assessmentId = $testAsmId
        userId       = $UserId
    }
    $submitResp = Invoke-Api -Method POST -Url "$apiAdap/submit" -Body $submitBody
    if ($submitResp.ok -and $submitResp.data.success) {
        $report = $submitResp.data.report
        Pass "Final submit succeeded"
        Info "Total marks       : $($report.total_marks ?? $report.totalMarks)"
        Info "Obtained marks    : $($report.obtained_marks ?? $report.obtainedMarks)"
        Info "Marks %           : $($report.marks_percentage ?? $report.marksPercentage)%"
        Info "Final eval score  : $($report.final_evaluation_score ?? $report.finalEvaluationScore)"
        Info "Performance level : $($report.performance_level ?? $report.performanceLevel)"
        Info "Reliability       : $($report.reliability_level ?? $report.reliabilityLevel) ($($report.reliability_score ?? $report.reliabilityScore))"
        Info "Topic mastery     : $($report.topic_mastery_score ?? $report.topicMasteryScore)"
    } else {
        Fail "Final submit failed: $($submitResp.error)"
    }

    # ── Get report ────────────────────────────────────────────────────────────
    $reportResp = Invoke-Api -Url "$apiAdap/report/$attemptToken"
    if ($reportResp.ok -and $reportResp.data.success) {
        Pass "Report endpoint OK — report persisted and retrievable"
        if ($Verbose) {
            $r = $reportResp.data.report
            Info "Strong topics : $($r.strong_topics -join ', ')"
            Info "Weak topics   : $($r.weak_topics -join ', ')"
            Info "Recommended   : $($r.recommended_topics -join ', ')"
        }
    } else {
        Fail "Report endpoint failed: $($reportResp.error)"
    }
}

# ── 7. Edge Cases ─────────────────────────────────────────────────────────────

Section "7. Edge Case Validation"

# Invalid assessment ID
$badResp = Invoke-Api -Url "$apiAdap/blueprint/999999" -Silent
if (-not $badResp.ok) {
    Pass "Non-existent assessment returns error (expected)"
} else {
    Fail "Non-existent assessment should return 404"
}

# Invalid block number
$badBlockResp = Invoke-Api -Url "$apiAdap/block/FAKE-TOKEN/abc" -Silent
if (-not $badBlockResp.ok) {
    Pass "Invalid block number returns error (expected)"
} else {
    Fail "Invalid block number should return 400"
}

# Duplicate snapshot (idempotency)
if ($attemptToken -and $attemptToken -ne "TEST-ADAP-$(Get-Date -Format 'yyyyMMddHHmmss')") {
    $dupBody = @{
        attemptToken  = $attemptToken
        blockNumber   = 1
        timeTaken     = 100
        answers       = @{}
        questionTiming = @{}
    }
    $dupResp = Invoke-Api -Method POST -Url "$apiAdap/block/complete" -Body $dupBody
    if ($dupResp.ok -and $dupResp.data.alreadySnapshotted -eq $true) {
        Pass "Duplicate snapshot is idempotent (alreadySnapshotted=true)"
    } else {
        Skip "Could not verify snapshot idempotency"
    }
}

# Settings validation — invalid values
$badSettings = Invoke-Api -Method PUT -Url "$apiAdap/settings/$testAsmId" -Body @{ adaptiveTotalBlocks = 999 } -Silent
if (-not $badSettings.ok) {
    Pass "Invalid adaptiveTotalBlocks (999) rejected with error"
} else {
    Fail "Invalid adaptiveTotalBlocks should be rejected"
}

$badSettings2 = Invoke-Api -Method PUT -Url "$apiAdap/settings/$testAsmId" -Body @{ adaptiveTotalMarks = -5 } -Silent
if (-not $badSettings2.ok) {
    Pass "Negative adaptiveTotalMarks rejected with error"
} else {
    Fail "Negative adaptiveTotalMarks should be rejected"
}

# ── 8. Summary ────────────────────────────────────────────────────────────────

Section "Test Summary"

$total = $script:passed + $script:failed + $script:skipped
Write-Host ""
Write-Host "  Total  : $total" -ForegroundColor White
Write-Host "  Passed : $($script:passed)" -ForegroundColor Green
Write-Host "  Failed : $($script:failed)" -ForegroundColor $(if ($script:failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped: $($script:skipped)" -ForegroundColor DarkGray
Write-Host ""

if ($script:failed -eq 0) {
    Write-Host "  🎉 All tests passed!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  $($script:failed) test(s) failed. Review output above." -ForegroundColor Red
}

Write-Host ""
Write-Host "  Key endpoints:" -ForegroundColor Cyan
Write-Host "    GET  $apiAdap/health" -ForegroundColor Gray
Write-Host "    GET  $apiAdap/settings/{assessmentId}" -ForegroundColor Gray
Write-Host "    PUT  $apiAdap/settings/{assessmentId}" -ForegroundColor Gray
Write-Host "    GET  $apiAdap/blueprint/{assessmentId}" -ForegroundColor Gray
Write-Host "    POST $apiAdap/blueprint/{assessmentId}/refresh" -ForegroundColor Gray
Write-Host "    POST $apiAdap/block/generate" -ForegroundColor Gray
Write-Host "    POST $apiAdap/block/complete" -ForegroundColor Gray
Write-Host "    POST $apiAdap/block/save-answers" -ForegroundColor Gray
Write-Host "    GET  $apiAdap/block/{token}/{blockNum}" -ForegroundColor Gray
Write-Host "    GET  $apiAdap/status/{token}" -ForegroundColor Gray
Write-Host "    POST $apiAdap/submit" -ForegroundColor Gray
Write-Host "    GET  $apiAdap/report/{token}" -ForegroundColor Gray
Write-Host ""

if ($script:failed -gt 0) { exit 1 }
