# backend/db

This directory no longer holds schema.

Everything here was a loose `.sql` file that **no migrator ran**. Each had to be
applied by hand, so in practice they were applied inconsistently or not at all,
and they drifted behind the application code. A freshly migrated database was
missing whole tables and dozens of columns that the services select by name.

The schema now lives in tracked migrations:

| Was | Now |
| --- | --- |
| `schema.sql` | `assessment-service/db/migrations/012_tech_assessment_schema.sql` |
| `003_adaptive_engine_v2.sql` | `assessment-service/db/migrations/013_adaptive_engine_v2.sql` |
| `block-adaptive-schema.sql` | superseded by `001_baseline.sql` (its `update_updated_at_column()` function moved into 013) |
| `migrate-block-adaptive.sql` | superseded by `001_baseline.sql` |
| `improved-adaptive-schema.sql` | deleted — 9 speculative tables (ML models, user profiles, partitioned analytics) with no code referencing them and no database containing them |

## Changing the schema

Add a numbered file to `assessment-service/db/migrations/`. It is applied at
boot when `RUN_MIGRATIONS=true` and recorded in `assessment_db_version`.

Two rules that this directory's history argues for:

1. **Make migrations self-contained.** `013` originally called a trigger
   function defined only in `block-adaptive-schema.sql`, so it failed on any
   database where that file had not been hand-applied.
2. **Order across services matters.** The `tech_*` tables carry foreign keys to
   `users(id)`, which exam-engine's goose baseline creates. On a shared
   database, exam-engine must migrate before assessment-service.
