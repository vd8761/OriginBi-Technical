package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// pickedQuestion is the per-row output of pickCodingQuestions. It carries
// enough to (a) write a per-attempt exam_questions row and (b) materialize
// the candidate-facing snapshot DTO.
type pickedQuestion struct {
	questionVersionID uuid.UUID
	title             string
	difficulty        int
	score             float64
	body              []byte
	// `wantedBucket` is the bucket the question was originally PICKED for
	// (matches its own bucket on a normal pick, but may differ on spillover).
	wantedBucket string
}

// spilloverReport summarizes any cross-bucket borrowing that happened during
// pickCodingQuestions, suitable for embedding on an attempt_started event.
type spilloverReport struct {
	// Counts that were targeted per bucket.
	Targets map[string]int `json:"targets"`
	// Counts actually delivered per *configured* bucket. May be less than the
	// target if even spillover couldn't satisfy demand.
	Delivered map[string]int `json:"delivered"`
	// Map of "from→to" borrow events, e.g. {"hard→medium": 2} means two slots
	// originally configured as hard were filled with medium questions.
	Borrows map[string]int `json:"borrows,omitempty"`
}

// pickCodingQuestions is the heart of the builder: given a language slug it
// reads the config (if present) and assembles the candidate's question set.
//
// Selection algorithm:
//  1. Look up the per-language config. Missing row → default policy: take
//     every eligible question (no difficulty quotas, no tag filter beyond
//     "must allow this language").
//  2. Query the active coding bank, randomly ordered, grouped by difficulty
//     bucket (1–2 easy, 3–4 medium, 5+ hard).
//  3. Pick min(configured, available) from each bucket.
//  4. If short of total and allow_spillover is true, fill from adjacent
//     buckets: hard→medium→easy, medium→hard→easy, easy→medium→hard.
//  5. Still short? Return a typed error so the caller surfaces 409 with
//     bank-shortage detail.
//
// The function performs only SELECTs. Callers that need to persist the
// selection (the runtime builder) must INSERT exam_questions rows themselves
// once they have an attemptID. Preview callers use the returned slice as-is.
func (s *Server) pickCodingQuestions(
	ctx context.Context,
	q snapshotQueryer,
	languageSlug string,
) ([]pickedQuestion, spilloverReport, error) {
	cfg, hasCfg, err := s.loadCodingConfigForBuilder(ctx, languageSlug)
	if err != nil {
		return nil, spilloverReport{}, err
	}

	pool, err := s.queryCodingBankPool(ctx, q, languageSlug, cfg.IncludeTags)
	if err != nil {
		return nil, spilloverReport{}, err
	}

	// Bucket the pool.
	buckets := map[string][]pickedQuestion{"easy": {}, "medium": {}, "hard": {}}
	for _, p := range pool {
		b := difficultyBucket(p.difficulty)
		p.wantedBucket = b
		buckets[b] = append(buckets[b], p)
	}

	// Default policy: no per-bucket quotas, just take everything matching.
	if !hasCfg {
		all := make([]pickedQuestion, 0, len(pool))
		all = append(all, pool...)
		return all, spilloverReport{
			Targets:   map[string]int{"easy": 0, "medium": 0, "hard": 0},
			Delivered: map[string]int{"easy": len(buckets["easy"]), "medium": len(buckets["medium"]), "hard": len(buckets["hard"])},
		}, nil
	}

	targets := map[string]int{"easy": cfg.EasyCount, "medium": cfg.MediumCount, "hard": cfg.HardCount}
	picked := map[string][]pickedQuestion{"easy": nil, "medium": nil, "hard": nil}

	// Pass 1: satisfy each bucket from its own pool.
	for bucket, want := range targets {
		got := minInt(want, len(buckets[bucket]))
		picked[bucket] = buckets[bucket][:got]
		buckets[bucket] = buckets[bucket][got:]
	}

	borrows := map[string]int{}

	// Pass 2: spillover. Each bucket's neighbor priority is fixed; "adjacent"
	// in this product means the next-closest bucket on the difficulty axis.
	if cfg.AllowSpillover {
		spillorder := map[string][]string{
			"hard":   {"medium", "easy"},
			"medium": {"hard", "easy"},
			"easy":   {"medium", "hard"},
		}
		for _, bucket := range []string{"easy", "medium", "hard"} {
			deficit := targets[bucket] - len(picked[bucket])
			if deficit <= 0 {
				continue
			}
			for _, donor := range spillorder[bucket] {
				if deficit == 0 {
					break
				}
				take := minInt(deficit, len(buckets[donor]))
				if take == 0 {
					continue
				}
				picked[bucket] = append(picked[bucket], buckets[donor][:take]...)
				buckets[donor] = buckets[donor][take:]
				borrows[fmt.Sprintf("%s→%s", bucket, donor)] = take
				deficit -= take
			}
		}
	}

	// Pass 3: tally and bail out if still short.
	out := []pickedQuestion{}
	delivered := map[string]int{}
	for _, bucket := range []string{"easy", "medium", "hard"} {
		out = append(out, picked[bucket]...)
		delivered[bucket] = len(picked[bucket])
	}

	totalDelivered := delivered["easy"] + delivered["medium"] + delivered["hard"]
	if totalDelivered < cfg.TotalQuestions {
		return nil, spilloverReport{Targets: targets, Delivered: delivered, Borrows: borrows},
			fmt.Errorf(
				"coding bank under-stocked for %s: configured %d, deliverable %d (easy %d/%d, medium %d/%d, hard %d/%d)",
				languageSlug, cfg.TotalQuestions, totalDelivered,
				delivered["easy"], cfg.EasyCount,
				delivered["medium"], cfg.MediumCount,
				delivered["hard"], cfg.HardCount,
			)
	}

	return out, spilloverReport{Targets: targets, Delivered: delivered, Borrows: borrows}, nil
}

// buildCodingFrozenSnapshot is the runtime entry point invoked from the
// attempt-start flow. It picks the questions, writes per-attempt
// exam_questions rows tagged with `attempt_built_for = attemptID`, and
// returns a frozenAttemptSnapshot ready to be stored on the attempt.
func (s *Server) buildCodingFrozenSnapshot(
	ctx context.Context,
	tx pgx.Tx,
	examVersionID, attemptID uuid.UUID,
	languageSlug string,
	totalSeconds int,
) (frozenAttemptSnapshot, spilloverReport, error) {
	picked, spill, err := s.pickCodingQuestions(ctx, tx, languageSlug)
	if err != nil {
		return frozenAttemptSnapshot{}, spill, err
	}

	// Honor optional per-language time override, even when no quota config is
	// set (an admin might set just the time, leaving counts at default-all).
	if override, err := s.loadCodingTimeOverride(ctx, languageSlug); err == nil && override != nil {
		totalSeconds = *override
	}

	// Resolve a section to attach these rows to. Coding currently has one
	// section per exam_version; pull the first one. Future per-section
	// configs would route per-bucket inserts to different sections.
	var sectionID uuid.UUID
	if err := tx.QueryRow(ctx, `
		SELECT id FROM exam_sections WHERE exam_version_id = $1 ORDER BY ordinal LIMIT 1
	`, examVersionID).Scan(&sectionID); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return frozenAttemptSnapshot{}, spill, err
	}

	questions := make([]snapshotQuestionDTO, 0, len(picked))
	for i, p := range picked {
		ord := i + 1
		eqID := uuid.New()
		_, err := tx.Exec(ctx, `
			INSERT INTO exam_questions (
			    id, exam_version_id, section_id, question_version_id,
			    ordinal, score_override, is_mandatory, attempt_built_for
			)
			VALUES ($1, $2, $3, $4, $5, $6, true, $7)
		`, eqID, examVersionID, nullableUUID(sectionID), p.questionVersionID, ord, p.score, attemptID)
		if err != nil {
			return frozenAttemptSnapshot{}, spill, fmt.Errorf("insert per-attempt exam_question: %w", err)
		}
		candidateBody, err := s.candidateQuestionBody(ctx, p.questionVersionID, p.title, p.difficulty, p.body)
		if err != nil {
			return frozenAttemptSnapshot{}, spill, err
		}
		questions = append(questions, snapshotQuestionDTO{
			ExamQuestionID:    eqID.String(),
			QuestionVersionID: p.questionVersionID.String(),
			Ordinal:           ord,
			Score:             p.score,
			Body:              candidateBody,
		})
	}

	bareLang := strings.TrimPrefix(languageSlug, "language.")
	return frozenAttemptSnapshot{
		AssignmentRef:    "coding:" + bareLang,
		Language:         bareLang,
		ExamVersionID:    examVersionID.String(),
		TotalTimeSeconds: totalSeconds,
		Questions:        questions,
		CreatedAt:        time.Now().UTC(),
	}, spill, nil
}

// ─── Helpers used by both the runtime builder and the preview endpoint ─────

// builderConfig is the validated shape pickCodingQuestions operates on. Maps
// 1:1 to the coding_language_configs row, minus UI-only fields.
type builderConfig struct {
	TotalQuestions int
	EasyCount      int
	MediumCount    int
	HardCount      int
	AllowSpillover bool
	IncludeTags    []string
}

func (s *Server) loadCodingConfigForBuilder(ctx context.Context, slug string) (builderConfig, bool, error) {
	var cfg builderConfig
	var tags []byte
	err := s.pool.QueryRow(ctx, `
		SELECT total_questions, easy_count, medium_count, hard_count,
		       allow_spillover, include_tags
		FROM coding_language_configs WHERE language_slug = $1
	`, slug).Scan(
		&cfg.TotalQuestions, &cfg.EasyCount, &cfg.MediumCount, &cfg.HardCount,
		&cfg.AllowSpillover, &tags,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return builderConfig{}, false, nil
	}
	if err != nil {
		return builderConfig{}, false, err
	}
	if len(tags) > 0 {
		_ = json.Unmarshal(tags, &cfg.IncludeTags)
	}
	return cfg, true, nil
}

func (s *Server) loadCodingTimeOverride(ctx context.Context, slug string) (*int, error) {
	var v *int
	err := s.pool.QueryRow(ctx, `
		SELECT time_seconds_override FROM coding_language_configs WHERE language_slug = $1
	`, slug).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return v, err
}

func (s *Server) queryCodingBankPool(
	ctx context.Context,
	q snapshotQueryer,
	languageSlug string,
	includeTags []string,
) ([]pickedQuestion, error) {
	var includeTagsJSON []byte
	if len(includeTags) > 0 {
		j, err := json.Marshal(includeTags)
		if err == nil {
			includeTagsJSON = j
		}
	}
	rows, err := q.Query(ctx, `
		SELECT qv.id, q.title, qv.difficulty,
		       COALESCE(qv.max_score, 0)::float8,
		       qv.body
		FROM questions q
		JOIN question_versions qv ON qv.id = q.current_version_id
		JOIN plugins p ON p.id = q.plugin_id
		WHERE p.slug = 'assessment.coding'
		  AND q.is_archived = false
		  AND COALESCE(qv.body->>'mode', 'main') = 'main'
		  AND qv.body->'allowedLanguages' ? $1
		  AND (
		      $2::jsonb IS NULL
		      OR jsonb_array_length($2::jsonb) = 0
		      OR EXISTS (
		          SELECT 1 FROM jsonb_array_elements_text($2::jsonb) t
		          WHERE qv.body->'tags' ? t.value
		      )
		  )
		ORDER BY random()
	`, languageSlug, includeTagsJSON)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []pickedQuestion{}
	for rows.Next() {
		var p pickedQuestion
		if err := rows.Scan(&p.questionVersionID, &p.title, &p.difficulty, &p.score, &p.body); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// codingLanguageSlugFromRef extracts the full language plugin slug
// ("language.python") from an assignment ref of the form "coding:python".
// Returns empty when the ref isn't a coding ref so the caller falls back to
// the legacy static-bundle builder.
func codingLanguageSlugFromRef(assignmentRef string) string {
	const prefix = "coding:"
	if !strings.HasPrefix(assignmentRef, prefix) {
		return ""
	}
	bare := strings.TrimSpace(strings.TrimPrefix(assignmentRef, prefix))
	if bare == "" {
		return ""
	}
	return "language." + strings.ToLower(bare)
}

func nullableUUID(id uuid.UUID) any {
	if id == uuid.Nil {
		return nil
	}
	return id
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
