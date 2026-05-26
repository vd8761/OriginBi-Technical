-- +goose Up
-- Per-test-case explanation, shown to the candidate beneath a sample test
-- case's input/output. The authoring spec treats this as a first-class field
-- on every test case (sample or hidden); hidden ones simply never surface it.
ALTER TABLE question_test_cases
    ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL DEFAULT '';
