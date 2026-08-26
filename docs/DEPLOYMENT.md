# Deploying OriginBi Technical

Everything needed to take this repo from a laptop to a production droplet, in
the order it has to happen. `docs/RUNBOOK.md` covers day-to-day operation;
this file covers the first launch.

## Topology

The application database is **Neon, in `ap-southeast-1` (Singapore)**. That one
fact fixes the droplet's region: put it in **SGP1**. A droplet in BLR1 or NYC
would add tens of milliseconds to every query, and a timed exam pays that on
every question load, autosave and submit.

**As actually deployed (2026-08-25):**

```
Vercel  evaluation.originbi.com          Next.js frontend, built from git
   |                                     calls the droplet cross-origin
   v
DigitalOcean droplet - 1 vCPU / 2 GB, SGP1 (same region as the Neon project)
159.223.65.155  ->  evaluation-api.originbi.com
|
+-- nginx :80 :443              the only ports open to the internet, plus 22
|     +-- /v1/          -> exam_engine          upstream
|     +-- /api/         -> assessment_service   upstream
|     +-- /auth-api/    -> auth_service         upstream (prefix stripped)
|     +-- /student-api/ -> auth_service         upstream (prefix stripped)
|
+-- assessment-service  127.0.0.1:5000   PM2, fork x1 (it runs the migrations)
+-- auth-service        0.0.0.0:4002     PM2, fork x1
+-- exam-engine         127.0.0.1:8088   systemd
+-- Judge0                               NOT DEPLOYED - the coding bank is empty

Neon PostgreSQL 18 - ap-southeast-1, managed
```

Every service is **fork x1**, not cluster. On a single core a second worker
competes for the same CPU rather than adding throughput; nginx's `upstream`
blocks are written to take extra replicas the day the box gets more cores.
See `ecosystem.droplet.config.js`, which is what this host runs -
`ecosystem.config.js` describes the larger frontend-on-droplet topology below
and is not in use.

The frontend is on Vercel, so the routing above replaces the Next.js
`rewrites()` for anything server-side. Note that `frontend/lib/api.ts` pins
the browser to same-origin paths, so student traffic is still proxied through
Vercel; set Vercel's function region to `sin1` or those requests cross the
Pacific twice per autosave.

**The original single-droplet design, for reference:**

```
DigitalOcean droplet - 4 vCPU / 8 GB, SGP1 (same region as the Neon project)
|
+-- nginx :80 :443              the only ports open to the internet, plus 22
|     +-- proxies everything to the frontend; Next.js rewrites reach the rest
|
+-- frontend            127.0.0.1:3000   PM2, cluster x2
+-- assessment-service  127.0.0.1:5000   PM2, fork x1 (it runs the migrations)
+-- auth-service        127.0.0.1:4002   PM2, cluster x2
+-- exam-engine         127.0.0.1:8088   systemd
+-- Judge0              127.0.0.1:2358   Docker Compose (+ its own pg and redis)

Neon PostgreSQL 18 - ap-southeast-1, managed
```

`tech-assessment-engine` is not deployed. Nothing calls it (see RUNBOOK).

**Judge0 keeps its own bundled Postgres inside Docker on the droplet** - that
is the database the sandbox needs to be co-located with, and it is. Judge0
never touches Neon. The requirement that Judge0 and its database share a region
is satisfied by them sharing a machine.

If Judge0's workers start crowding the app, move *Judge0* to a second droplet
in the same region and leave everything else where it is.

### Use the pooled connection string

Point the services at Neon's **pooler** endpoint - the hostname with `-pooler`
in it - not the direct one. Four Node processes (two frontend, two
auth-service) plus assessment-service and exam-engine each keep their own
connection pool; against the direct endpoint that exhausts Neon's connection
limit under load. The direct endpoint is the right one for migrations and the
import script, which are single short-lived connections.

## Firewall

Open 22 (your IP only), 80 and 443. Nothing else — in particular **never 2358**.
Judge0's workers run `privileged` with `JUDGE0_ALLOW_UNSAFE_EXECUTION`, so
anything that can reach that port has arbitrary code execution on the host.
`docker-compose.yml` binds it to `127.0.0.1` for the same reason.

## Step 1 — Provision

```bash
# as root, once
# No postgresql server package: the application database is Neon. postgresql-client
# is still worth having for psql when running the seeds.
# Swap first: the box has 2 GB and `nest build` will not complete without it.
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10        # prefer RAM; swap is for builds, not runtime

# No docker packages: Judge0 is not deployed (see Step 4).
apt update && apt install -y nginx postgresql-client certbot python3-certbot-nginx
# Node 22 and Go per their own install instructions, plus:
npm install -g pm2

useradd --system --no-create-home --shell /usr/sbin/nologin originbi
git clone <repo> /home/OriginBi-Technical
chown -R originbi: /home/OriginBi-Technical
```

`PROJECT_PATH` in `.github/workflows/deploy.yml` is `/home/OriginBi-Technical`.
Clone somewhere else and that has to change too.

## Step 2 — Secrets

Copy each template and fill it in. These files are gitignored; keep them that
way, and keep them unreadable by anyone else:

```bash
cp backend/exam-engine/.env.local.example            backend/exam-engine/.env.local
cp backend/assessment-service/.env.local.example     backend/assessment-service/.env.local
cp backend/auth-service/.env.local.example           backend/auth-service/.env.local
cp frontend/.env.example                             frontend/.env.local
cp backend/judge0/judge0.conf.example                backend/judge0/judge0.conf

chmod 400 backend/*/.env.local backend/judge0/judge0.conf
chown originbi: backend/*/.env.local backend/judge0/judge0.conf
```

Non-obvious values:

| Where | Value | Why |
| --- | --- | --- |
| all backends | `COGNITO_ENDPOINT` **unset** | Set, it points authentication at a local simulator. auth-service refuses to boot with it set in production; the others do not check. |
| all backends | `ALLOWED_ORIGINS=https://yourdomain` | Exact origin, no trailing slash, no `*` — credentialed requests need a specific origin. |
| assessment-service | `ASSESSMENT_AUTH=on` | It refuses to start with auth off when `NODE_ENV=production`. Leave it. |
| exam-engine | `APP_ENV=production`, `DEV_AUTH_BYPASS` unset | The `X-User-Id` bypass is refused in production, but do not rely on that alone. |
| exam-engine | `JUDGE0_AUTH_TOKEN` = judge0.conf's `AUTHN_TOKEN` | Judge0's only access control. `JUDGE0_AUTH_HEADER` must equal its `AUTHN_HEADER`. |
| judge0.conf | every `CHANGE_ME_*` | Generate with `openssl rand -hex 32`. **The old values are in git history — the token and both passwords must be new ones.** |
| both engines | `CERT_PASS_PERCENT` identical | Different values let a candidate show as passed on one screen and failed on another. |
| auth-service | `EMAIL_FROM` + AWS SES keys | Without them the service logs each email it would have sent and carries on. Welcome and certificate mail silently stop. |
| frontend | `NEXT_PUBLIC_*` | Inlined at `next build`. Changing one means rebuilding, not restarting. |

The Cognito app client needs **`ALLOW_ADMIN_USER_PASSWORD_AUTH`** enabled:
auth-service signs in with `AdminInitiateAuth`. The IAM user needs
`AdminInitiateAuth`, `AdminCreateUser`, `AdminSetUserPassword`,
`AdminAddUserToGroup`, `AdminGetUser`, `AdminListGroupsForUser`,
`ForgotPassword`, `GetUser` and `GlobalSignOut` on the pool, plus
`ses:SendEmail` if email is on.

## Step 3 - Database

**Already done for the current Neon database.** This section records what was
run, so a second environment can be built the same way.

Migrations, in this order - it is not optional. exam-engine's baseline creates
`users`, `registrations` and `questions`; assessment-service's `tech_*` tables
carry foreign keys to `users(id)`, so the reverse order fails on the first one.

```bash
# 1. exam-engine (goose) - migrate without starting the server
cd backend/exam-engine
DATABASE_URL="$DIRECT_URL" go run ./cmd/migrate

# 2. assessment-service (its own runner) - applied at boot from db/migrations/
cd backend/assessment-service
DB_HOST=... DB_PORT=5432 DB_USER=... DB_PASS=... DB_NAME=... npm run start
```

Both migrators abort on failure on purpose. If a service exits with
`[Migrator] failed on ...`, fix the migration; do not start it with migrations
disabled.

Then the seeds, in this order:

```bash
# The first admin. Edit the address in the file before running it.
psql "$DIRECT_URL" -f backend/assessment-service/db/seeds/002_admin_user.sql

# The coding exam shell. exam_assignments.exam_version_id is NOT NULL and
# exam-engine falls back to a fixed version UUID, so /v1/purchases/coding
# fails its foreign key on a database without these three rows.
psql "$DIRECT_URL" -f backend/exam-engine/scripts/seed_coding_exam_shell.sql

# Content: the academic catalogue and the four MCQ question banks, copied from
# the sibling originbi database where they stayed after the separation.
# Content tables only - never users, registrations, attempts or purchases.
node backend/scripts/import-content-from-originbi.js \
  --source "postgres://user:pass@host:5432/originbi" \
  --target "$DIRECT_URL" \
  --owner-email <your admin address> \
  --dry-run          # drop --dry-run once the counts look right
```

`001_programs.sql` seeds the three programme codes the signup form hardcodes.
The import supersedes it - the sibling's catalogue is authoritative and
contains them - so it is only needed where there is no sibling access.

The admin row deliberately has a NULL `cognito_sub`: login resolves by email
when none is recorded, and auth-service backfills it on the first successful
sign-in. **An account with that same email must exist in the production Cognito
pool** - this row grants the role, Cognito proves the identity.

## Step 4 — Judge0 (NOT deployed)

**Skip this step for the current deployment.** Judge0 is not running: the
coding question bank is empty in every source, including the VM backup of the
sibling `originbi` database, so there is nothing for it to execute. Its
prerequisites on this host do check out - cgroup v2, x86_64, `/sys/fs/cgroup`
writable - but `swapaccount=1` is absent from the kernel cmdline, which
isolate wants for per-run memory limits.

**Before it is ever started, rotate every secret in `judge0.conf`.** The file
was committed with live values and they remain in git history on a public
repository. `judge0.conf.example` is the tracked template.

The original instructions follow, for when there is content to run.



```bash
cd backend/judge0 && docker compose up -d --remove-orphans
curl -H "X-Auth-Token: $TOKEN" http://127.0.0.1:2358/languages   # from the droplet only
```

Then confirm exam-engine can reach it: `GET /v1/admin/judge0/health` as an
admin. If that 401s from Judge0, `JUDGE0_AUTH_TOKEN` and `AUTHN_TOKEN` disagree.

Judge0's workers need cgroup v2 on the host (the default on modern Linux) —
see the comments in `docker-compose.yml`.

## Step 5 — Processes

```bash
# Go service
cp deploy/systemd/exam-engine.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now exam-engine

# Node services — ecosystem.droplet.config.js is what this host runs
# (fork x1, no frontend). ecosystem.config.js is the larger topology.
pm2 start ecosystem.droplet.config.js
pm2 save && pm2 startup      # survives reboot
pm2 install pm2-logrotate
```

Do **not** enable `tech-assessment-engine`.

## Step 6 — TLS

```bash
cp deploy/nginx/originbi-technical.conf /etc/nginx/sites-available/originbi-technical
# edit server_name, then:
ln -s /etc/nginx/sites-available/originbi-technical /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
certbot --nginx -d evaluation-api.originbi.com

# certbot prepends a server-level `if ($host = ...) { return 301; }` to the
# :80 server. It runs in the rewrite phase, before location matching, so it
# shadows the ACME challenge location and a webroot renewal can never
# succeed. Delete that block — the explicit `location /` already redirects.
nginx -t && systemctl reload nginx
```

The config forwards `X-Forwarded-For` and both Node services call
`set('trust proxy', 1)`. Without that pair, their per-IP throttles see every
request as coming from nginx and rate-limit the whole internet as one client.

## Step 7 — Continuous deployment

The workflow in `.github/workflows/deploy.yml` already does change detection,
verify-before-deploy, and per-service deploys over SSH. It needs three repo
secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

Give the deploy user passwordless sudo for exactly one command:

```
originbi-deploy ALL=(root) NOPASSWD: /bin/systemctl restart exam-engine
```

Turn on branch protection for `main` with the `verify-*` jobs required. They
run on pull requests too, which is the point: a failing verify blocks the merge
rather than the deploy.

## Step 8 — Smoke test before announcing

Candidate: sign up → login → purchase → all five modules end to end →
certificate → `/my-score`. Admin: login → results roster → a result detail.

Then confirm the guards are live:

```bash
curl -i https://yourdomain.com/api/admin/results                  # expect 401
curl -i -H "Authorization: Bearer <student token>" \
     https://yourdomain.com/api/admin/results                     # expect 403
curl -i -H "X-User-Context: {\"role\":\"ADMIN\"}" \
     https://yourdomain.com/api/admin/users                       # expect 401
```

## Day two

- `pg_dump` to Spaces on a cron, plus DigitalOcean droplet backups.
- Uptime monitoring on `https://yourdomain.com/`, `/api/health` and
  exam-engine's `/readyz`.
- `pm2 logs` and `journalctl -u exam-engine` are where failures surface.

## Content — imported 2026-08-25

The four MCQ banks and the academic catalogue were imported from a `pg_dump`
of the sibling `originbi` database taken off the retired BLR1 VM, using
`backend/scripts/import-content-from-originbi.js`:

| | rows |
| --- | --- |
| tech_aptitude_questions / options | 44,453 / 123,993 |
| tech_grammar_questions / options | 25,536 / 85,346 |
| tech_role_questions / options | 38,975 / 155,853 |
| tech_mnc_questions / options | 20 / 80 |
| departments / degree_types / department_degrees | 30 / 11 / 41 |
| programs | 7 |
| tech_assessments | 5 |

Users, registrations, attempts and purchases were deliberately not imported;
identity is per-platform and `users.id` means different people in the two
databases. The admin is seeded separately (Step 3).

## Content still missing

- **The coding question bank is empty and has no source.** The four MCQ modules
  were imported from the sibling database; coding was not, because it is not
  there either - the sibling's `questions` table is its personality bank and it
  has no `tech_coding_questions`. The only coding content in either repo is
  sample data: `backend/exam-engine/seed/coding_questions_full.csv` (16
  questions) and `scripts/reseed_coding.sql` (3 toy fixtures - and it opens by
  deleting every attempt, so never run it against production). Load the real
  bank through the admin authoring UI, or import the CSV as a starter set.
- **About a quarter of the imported questions have no answer key.** 33,224 of
  44,453 aptitude questions carry a `correct_option_id`; grammar is 16,896 of
  25,536 and role 33,149 of 38,975. The import is faithful - the same gaps
  exist in the sibling database. A question with no key cannot be scored, so
  these need fixing at source or excluding from selection.

## Still open

- **`POST /student/profile` is unauthenticated** and returns a full profile for
  any email supplied. See RUNBOOK "Known gaps" — the fix is to move three
  frontend call sites onto the bearer token.
- **Certificate emails carry no PDF.** The sibling platform attached one; that
  path was not ported. The HTML certificate and the verify link are intact.
- **`Email_Vector.png`, `Popper.png` and `Pattern_mask.png`** are referenced by
  the email templates but are not in `frontend/public/`. Add them or those
  images stay broken in delivered mail.
- **Assessment-service's 403 path is not covered by CI** — it needs a real
  Cognito token in the test environment.
