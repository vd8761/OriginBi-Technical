-- Migration 009: Add adaptive_total_questions to tech_assessments
ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS adaptive_total_questions INTEGER DEFAULT 20;
