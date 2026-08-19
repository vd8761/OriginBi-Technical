// Deprecated entry point.
//
// This used to apply backend/db/schema.sql directly, bypassing the migration
// runner and its assessment_db_version bookkeeping. The schema is now a
// tracked migration (012_tech_assessment_schema.sql) applied by the same
// migrator as everything else, so hand-applying it is no longer correct — it
// is how the schema drifted out of sync with the code in the first place.

console.error(
    [
        "db:init has been removed.",
        "",
        "The schema is applied by the migration runner now. Either start the",
        "service with RUN_MIGRATIONS=true, or apply db/migrations/*.sql in",
        "filename order against the target database.",
    ].join("\n"),
);
process.exit(1);
