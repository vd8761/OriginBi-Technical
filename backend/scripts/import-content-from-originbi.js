#!/usr/bin/env node
/**
 * One-way content import: sibling `originbi` database → this platform's
 * `originbi_technical` database.
 *
 * Both platforms shared one database once, so the academic catalogue and the
 * whole technical question bank still live over there. The separation left
 * this database with the schema but none of the content: no departments (which
 * blocks COLLEGE_STUDENT signup outright — the form requires one) and no
 * questions in any module.
 *
 * This copies the content tables only. It never touches users, registrations,
 * attempts, purchases or anything else candidate-owned: identity is
 * per-platform and `users.id` means different people in the two databases.
 *
 * Two ordering problems it has to work around:
 *
 *  1. `tech_<module>_questions.correct_option_id` → `tech_<module>_options`
 *     and `tech_<module>_options.<module>_question_id` → the questions table.
 *     A circular pair, so questions land with a NULL answer key, the options
 *     follow, and the key is set in a third pass.
 *  2. `tech_assessments.created_by` is NOT NULL → `users(id)`. The source value
 *     is meaningless here, so it is remapped to --owner-email's user id.
 *
 * Primary keys are preserved, so questions keep the ids their options
 * reference. Every insert is ON CONFLICT DO NOTHING and sequences are reset at
 * the end: re-running imports only what is missing.
 *
 * Usage:
 *   node backend/scripts/import-content-from-originbi.js \
 *     --source "postgres://user:pass@localhost:5432/originbi" \
 *     --target "$DATABASE_URL" \
 *     --owner-email admin@example.com \
 *     [--dry-run]
 */

const { Pool } = require('pg');

const BATCH = 1000;

/** Catalogue tables, in dependency order. Copied wholesale. */
const REFERENCE_TABLES = [
  'departments',
  'degree_types',
  'department_degrees',
  'programs',
];

/** The four MCQ modules. Each is a questions/options pair with the circular FK. */
const MODULES = [
  { questions: 'tech_aptitude_questions', options: 'tech_aptitude_options', fk: 'aptitude_question_id' },
  { questions: 'tech_grammar_questions', options: 'tech_grammar_options', fk: 'grammar_question_id' },
  { questions: 'tech_mnc_questions', options: 'tech_mnc_options', fk: 'mnc_question_id' },
  { questions: 'tech_role_questions', options: 'tech_role_options', fk: 'role_question_id' },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  return process.argv[i + 1];
}
const DRY_RUN = process.argv.includes('--dry-run');

const log = (...a) => console.log(...a);

/**
 * Column names two databases agree on, in the target's order, paired with the
 * target's type so JSON columns can be handled specially on the way back in.
 */
async function sharedColumns(src, dst, table) {
  const q = `select column_name, data_type, is_nullable, column_default
               from information_schema.columns
              where table_schema='public' and table_name=$1 order by ordinal_position`;
  const s = new Set((await src.query(q, [table])).rows.map((r) => r.column_name));
  return (await dst.query(q, [table])).rows
    .filter((r) => s.has(r.column_name))
    .map((r) => ({
      name: r.column_name,
      isJson: r.data_type === 'jsonb' || r.data_type === 'json',
      // The two schemas drifted: some columns the source allows to be NULL are
      // NOT NULL here, with a default. Those rows fall back to the default
      // rather than failing the whole import.
      notNull: r.is_nullable === 'NO',
      hasDefault: r.column_default !== null,
    }));
}

/**
 * node-pg parses jsonb into JavaScript values on the way out, then serializes
 * a JS array back as a Postgres array literal ({a,b}) on the way in — which is
 * not valid JSON. Anything destined for a json/jsonb column is therefore
 * stringified explicitly. Null stays null.
 */
function encode(value, isJson) {
  if (!isJson || value === null || value === undefined) return value ?? null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

async function primaryKey(dst, table) {
  const { rows } = await dst.query(
    `select kcu.column_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
      where tc.table_schema='public' and tc.table_name=$1 and tc.constraint_type='PRIMARY KEY'
      order by kcu.ordinal_position`,
    [table],
  );
  return rows.map((r) => r.column_name);
}

/**
 * Streams a table across in batches.
 *
 * `overrides` replaces a column's value for every row (used for created_by).
 * `nullColumns` forces columns to NULL on insert — how the circular FK is
 * broken without a deferred constraint.
 */
async function copyTable(src, dst, table, { overrides = {}, nullColumns = [], where = '' } = {}) {
  const cols = await sharedColumns(src, dst, table);
  if (!cols.length) {
    log(`  ${table}: no shared columns, skipped`);
    return 0;
  }
  const pk = await primaryKey(dst, table);
  const total = (await src.query(`select count(*)::int n from ${table} ${where}`)).rows[0].n;
  if (!total) {
    log(`  ${table}: source empty`);
    return 0;
  }
  if (DRY_RUN) {
    log(`  ${table}: would copy ${total} rows (${cols.length} cols)`);
    return 0;
  }

  const quoted = cols.map((c) => `"${c.name}"`).join(', ');
  const conflict = pk.length ? `ON CONFLICT (${pk.map((c) => `"${c}"`).join(', ')}) DO NOTHING` : '';
  const order = pk.length ? `order by ${pk.map((c) => `"${c}"`).join(', ')}` : '';

  let copied = 0;
  for (let offset = 0; offset < total; offset += BATCH) {
    const { rows } = await src.query(
      `select ${quoted} from ${table} ${where} ${order} limit ${BATCH} offset ${offset}`,
    );
    if (!rows.length) break;

    const values = [];
    const tuples = rows.map((row) => {
      const placeholders = cols.map((col) => {
        const raw = nullColumns.includes(col.name)
          ? null
          : Object.prototype.hasOwnProperty.call(overrides, col.name)
            ? overrides[col.name]
            : row[col.name];
        if (raw === null || raw === undefined) {
          if (col.notNull && col.hasDefault) return 'DEFAULT';
        }
        values.push(encode(raw, col.isJson));
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const res = await dst.query(
      `insert into ${table} (${quoted}) values ${tuples.join(', ')} ${conflict}`,
      values,
    );
    copied += res.rowCount;
    process.stdout.write(`\r  ${table}: ${Math.min(offset + BATCH, total)}/${total}   `);
  }
  process.stdout.write('\n');
  return copied;
}

/**
 * Third pass of the circular-FK dance: fill in the answer key.
 *
 * The primary key is named per module (aptitude_question_id, role_question_id,
 * and so on), so it is read from the target rather than assumed.
 */
async function backfillAnswerKeys(src, dst, questionsTable) {
  const [pk] = await primaryKey(dst, questionsTable);
  const total = (await src.query(
    `select count(*)::int n from ${questionsTable} where correct_option_id is not null`,
  )).rows[0].n;
  if (!total || DRY_RUN) {
    if (DRY_RUN) log(`  ${questionsTable}: would set ${total} answer keys`);
    return 0;
  }

  let updated = 0;
  for (let offset = 0; offset < total; offset += BATCH) {
    const { rows } = await src.query(
      `select "${pk}" as qid, correct_option_id from ${questionsTable}
        where correct_option_id is not null order by "${pk}" limit ${BATCH} offset ${offset}`,
    );
    if (!rows.length) break;
    const res = await dst.query(
      `update ${questionsTable} q
          set correct_option_id = v.correct_option_id
         from (select unnest($1::bigint[]) qid, unnest($2::bigint[]) correct_option_id) v
        where q."${pk}" = v.qid and q.correct_option_id is null`,
      [rows.map((r) => r.qid), rows.map((r) => r.correct_option_id)],
    );
    updated += res.rowCount;
    process.stdout.write(`\r  ${questionsTable} answer keys: ${Math.min(offset + BATCH, total)}/${total}   `);
  }
  process.stdout.write('\n');
  return updated;
}

/**
 * Copying rows with explicit ids leaves every sequence at 1, so the next
 * application insert collides with an imported row. Fast-forward them.
 */
async function resetSequences(dst, tables) {
  if (DRY_RUN) return;
  for (const table of tables) {
    const { rows } = await dst.query(
      `select column_name, pg_get_serial_sequence($1, column_name) seq
         from information_schema.columns
        where table_schema='public' and table_name=$1
          and pg_get_serial_sequence($1, column_name) is not null`,
      [table],
    );
    for (const { column_name, seq } of rows) {
      await dst.query(
        `select setval($1, coalesce((select max("${column_name}") from ${table}), 0) + 1, false)`,
        [seq],
      );
    }
  }
}

async function main() {
  const sourceUrl = arg('source');
  const targetUrl = arg('target', process.env.DATABASE_URL);
  const ownerEmail = arg('owner-email');

  if (!sourceUrl || !targetUrl) {
    console.error('--source and --target (or DATABASE_URL) are required');
    process.exit(1);
  }

  const src = new Pool({ connectionString: sourceUrl });
  const dst = new Pool({
    connectionString: targetUrl,
    ssl: /localhost|127\.0\.0\.1/.test(targetUrl) ? false : { rejectUnauthorized: false },
  });

  if (DRY_RUN) log('DRY RUN — nothing will be written\n');

  // tech_assessments.created_by is NOT NULL and references users(id). The
  // source id belongs to a different platform's user table.
  let ownerId = null;
  if (ownerEmail) {
    const { rows } = await dst.query('select id from users where lower(email)=lower($1)', [ownerEmail]);
    if (!rows.length) {
      console.error(`--owner-email ${ownerEmail} has no row in the target users table.`);
      process.exit(1);
    }
    ownerId = rows[0].id;
    log(`content will be attributed to users.id=${ownerId} (${ownerEmail})\n`);
  }

  log('reference catalogue');
  for (const table of REFERENCE_TABLES) {
    const n = await copyTable(src, dst, table);
    if (!DRY_RUN) log(`  ${table}: +${n}`);
  }

  log('\nassessment configuration');
  const assessmentOverrides = ownerId ? { created_by: ownerId } : {};
  const nAssess = await copyTable(src, dst, 'tech_assessments', { overrides: assessmentOverrides });
  if (!DRY_RUN) log(`  tech_assessments: +${nAssess}`);

  for (const mod of MODULES) {
    log(`\n${mod.questions.replace('tech_', '').replace('_questions', '')} module`);
    // Pass 1: questions without the answer key (it points at options that do
    // not exist yet).
    const q = await copyTable(src, dst, mod.questions, { nullColumns: ['correct_option_id'] });
    if (!DRY_RUN) log(`  questions: +${q}`);
    // Pass 2: options, which reference the questions just inserted.
    const o = await copyTable(src, dst, mod.options);
    if (!DRY_RUN) log(`  options: +${o}`);
    // Pass 3: close the cycle.
    const k = await backfillAnswerKeys(src, dst, mod.questions);
    if (!DRY_RUN) log(`  answer keys: ${k}`);
  }

  log('\nresetting sequences');
  await resetSequences(dst, [
    ...REFERENCE_TABLES,
    'tech_assessments',
    ...MODULES.flatMap((m) => [m.questions, m.options]),
  ]);

  log('done');
  await src.end();
  await dst.end();
}

main().catch((e) => {
  console.error('\nIMPORT FAILED:', e.message);
  process.exit(1);
});
