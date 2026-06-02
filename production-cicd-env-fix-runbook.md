# Production CI/CD and Environment Fix Runbook

Date checked: 2026-05-30

Server checked:

- VPS: `root@159.89.173.209`
- Production repo path: `/home/OriginBi-Technical`
- Branch expected in production: `develop`
- Latest checked commit: `5a3e78836416a0364d35022ce61ee52a3357990d`

## Executive Summary

CI/CD is not completely broken, but it is only partially working.

The GitHub Actions workflow successfully pulls the latest `develop` code onto the VPS. However, the actual service deploy jobs can be skipped even when code changed. This means the VPS checkout can be up to date while the running services are still old.

Separately, the VPS environment file setup is currently unsafe/inconsistent:

- `.env.local` files were renamed to `.env`.
- Systemd services still point to `.env.local`.
- The renamed `.env` files did not parse as normal dotenv files.
- The live `assessment-service` PM2 process only showed `NODE_ENV` among relevant env variables, which suggests its production DB/service envs are not being loaded through PM2 or a valid `.env`.

Frontend on the VPS can be ignored because production frontend is hosted on Vercel. Vercel envs must be checked separately in the Vercel project dashboard or CLI.

## What Was Observed

### 1. Git sync works

On the VPS:

```bash
cd /home/OriginBi-Technical
git branch --show-current
git rev-parse HEAD
git log -1 --oneline --decorate
```

Observed:

```text
develop
5a3e78836416a0364d35022ce61ee52a3357990d
5a3e788 (HEAD -> develop, origin/develop) Merge pull request #140 from vd8761/jayakrishna/dev
```

This confirms that the code checkout on the VPS is updated to the latest `origin/develop`.

### 2. GitHub Actions latest run succeeded but deploy jobs skipped

Latest workflow run checked:

```text
Deploy to VPS
Run ID: 26677591752
Event: push
Branch: develop
Commit: 5a3e78836416a0364d35022ce61ee52a3357990d
Conclusion: success
Started: 2026-05-30T07:04:01Z
```

Important job results:

```text
Detect Changed Services: success
Verify Frontend: success
Verify Assessment Service: success
Sync Codebase on VPS: success
Deploy Frontend: skipped
Deploy Assessment Service: skipped
Deploy Exam Engine: skipped
Deploy Tech Assessment Engine: skipped
Deploy Judge0: skipped
```

This is the main CI/CD issue.

The workflow reports success because verification and sync succeed, but service rebuild/reload jobs can still be skipped.

### 3. Runtime services are older than latest code

Examples from the VPS:

```text
frontend PM2 process created: 2026-05-26T06:25:32Z
frontend .next build files: 2026-05-26
latest develop commit: 2026-05-30
```

Frontend on the VPS is not important if Vercel is production, but this is strong evidence that a successful workflow does not necessarily rebuild/reload changed services.

Assessment service:

```text
assessment-service PM2 process created: 2026-05-28T08:08:39Z
```

So the production backend process may also be older than the latest code unless its deploy job actually runs.

## Root Cause 1: GitHub Actions deploy jobs are skipped

The workflow is in:

```text
.github/workflows/deploy.yml
```

The `sync` job already uses a robust condition:

```yaml
if: >-
  github.event_name == 'push' &&
  !cancelled() &&
  !failure() &&
  (
    needs.detect-changes.outputs.frontend == 'true' ||
    needs.detect-changes.outputs.exam_engine == 'true' ||
    needs.detect-changes.outputs.tech_engine == 'true' ||
    needs.detect-changes.outputs.assessment_service == 'true' ||
    needs.detect-changes.outputs.judge0 == 'true'
  )
```

But the deploy jobs use simpler conditions such as:

```yaml
if: github.event_name == 'push' && needs.detect-changes.outputs.assessment_service == 'true'
```

Because these jobs also depend on upstream jobs through `needs`, GitHub Actions can apply the default success behavior in a way that causes deploy jobs to skip when earlier dependency-chain jobs were skipped. In practice, this run verified frontend and assessment service, synced the code, then skipped all deploy jobs.

### Recommended workflow fix

Update every deploy job condition to explicitly allow skipped unrelated jobs, while still blocking real failures/cancellations.

Use this pattern:

```yaml
if: >-
  github.event_name == 'push' &&
  !cancelled() &&
  !failure() &&
  needs.detect-changes.outputs.assessment_service == 'true'
```

Apply it to:

```yaml
deploy-frontend:
  if: >-
    github.event_name == 'push' &&
    !cancelled() &&
    !failure() &&
    needs.detect-changes.outputs.frontend == 'true'

deploy-exam-engine:
  if: >-
    github.event_name == 'push' &&
    !cancelled() &&
    !failure() &&
    needs.detect-changes.outputs.exam_engine == 'true'

deploy-tech-engine:
  if: >-
    github.event_name == 'push' &&
    !cancelled() &&
    !failure() &&
    needs.detect-changes.outputs.tech_engine == 'true'

deploy-assessment-service:
  if: >-
    github.event_name == 'push' &&
    !cancelled() &&
    !failure() &&
    needs.detect-changes.outputs.assessment_service == 'true'

deploy-judge0:
  if: >-
    github.event_name == 'push' &&
    !cancelled() &&
    !failure() &&
    needs.detect-changes.outputs.judge0 == 'true'
```

### Optional workflow improvement

If a deployment should happen after any root-level deployment config change, add workflow/config files to the filters.

Example:

```yaml
assessment_service:
  - 'backend/assessment-service/**'
  - 'backend/shared/**'
  - 'backend/package.json'
  - 'backend/package-lock.json'
  - 'ecosystem.config.js'
  - '.github/workflows/deploy.yml'
```

Do the same for services whose deployment behavior depends on shared deployment files.

## Root Cause 2: Env files were renamed but service managers still point to old names

Files found before rename:

```text
/home/OriginBi-Technical/backend/assessment-service/.env.local
/home/OriginBi-Technical/backend/exam-engine/.env.local
/home/OriginBi-Technical/backend/tech-assessment-engine/.env.local
/home/OriginBi-Technical/frontend/.env.local
```

They were renamed to:

```text
/home/OriginBi-Technical/backend/assessment-service/.env
/home/OriginBi-Technical/backend/exam-engine/.env
/home/OriginBi-Technical/backend/tech-assessment-engine/.env
/home/OriginBi-Technical/frontend/.env
```

But systemd still points to `.env.local`:

```text
exam-engine:
EnvironmentFiles=/home/OriginBi-Technical/backend/exam-engine/.env.local

tech-assessment-engine:
EnvironmentFiles=/home/OriginBi-Technical/backend/tech-assessment-engine/.env.local
```

This means the currently running services may continue working because they already loaded envs, but a future restart can fail or start without the expected envs.

### Recommended systemd fix

Edit these unit files:

```bash
systemctl cat exam-engine
systemctl cat tech-assessment-engine
```

Likely files:

```text
/etc/systemd/system/exam-engine.service
/etc/systemd/system/tech-assessment-engine.service
```

Change:

```ini
EnvironmentFile=/home/OriginBi-Technical/backend/exam-engine/.env.local
```

to:

```ini
EnvironmentFile=/home/OriginBi-Technical/backend/exam-engine/.env
```

Change:

```ini
EnvironmentFile=/home/OriginBi-Technical/backend/tech-assessment-engine/.env.local
```

to:

```ini
EnvironmentFile=/home/OriginBi-Technical/backend/tech-assessment-engine/.env
```

Then reload systemd:

```bash
systemctl daemon-reload
```

Do not restart yet until the `.env` file contents are confirmed valid.

## Root Cause 3: The `.env` files do not parse as dotenv files

After the rename, a safe parse check showed:

```text
backend/assessment-service/.env: NO_DOTENV_KEYS
backend/exam-engine/.env: NO_DOTENV_KEYS
backend/tech-assessment-engine/.env: NO_DOTENV_KEYS
frontend/.env: NO_DOTENV_KEYS
```

That means the files did not contain normal dotenv assignments like:

```dotenv
DATABASE_URL=postgres://...
DB_HOST=...
DB_USER=...
```

They may contain placeholder text, malformed content, or some other non-dotenv value.

### Required fix

Open each `.env` on the VPS and confirm it uses standard dotenv format:

```bash
cd /home/OriginBi-Technical
nano backend/exam-engine/.env
nano backend/tech-assessment-engine/.env
nano backend/assessment-service/.env
```

Each non-comment setting should be:

```dotenv
KEY=value
```

No spaces before the key.
No shell commands.
No JSON object as the whole file.
No quotes required unless the value needs them.

Example:

```dotenv
NODE_ENV=production
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASS=replace_with_real_value
DB_NAME=obidatanew
ALLOWED_ORIGINS=https://evaluation.originbi.com
```

Do not commit production secrets into Git.

## Root Cause 4: assessment-service env loading is suspicious

The live `assessment-service` process only showed this relevant env:

```text
NODE_ENV
```

It did not show:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASS
DB_NAME
ALLOWED_ORIGINS
TECH_FRONTEND_URL
STUDENT_SERVICE_URL
ASSESSMENT_SERVICE_URL
RUN_MIGRATIONS
```

The service may still run because the code has defaults:

```text
DB_HOST -> localhost
DB_PORT -> 5432
DB_USER -> postgres
DB_PASS -> postgres
DB_NAME -> obidatanew
```

But relying on defaults in production is risky.

### Recommended PM2 fix

Update `/home/OriginBi-Technical/ecosystem.config.js` so `assessment-service` explicitly receives required envs or loads a valid `.env`.

Current PM2 config only sets:

```js
env: {
  NODE_ENV: 'production',
}
```

Option A: keep envs in `.env` and rely on Nest `ConfigModule`.

This only works if:

- `/home/OriginBi-Technical/backend/assessment-service/.env` is valid dotenv format.
- PM2 `cwd` remains `/home/OriginBi-Technical/backend/assessment-service`.
- The app starts after the `.env` file exists.

Option B: explicitly load dotenv before app start.

Add a start script wrapper or preload dotenv in the app entrypoint. This is more invasive and should be tested locally first.

Option C: put non-secret process wiring in PM2 and keep secrets in `.env`.

Example:

```js
{
  name: 'assessment-service',
  cwd: path.join(ROOT, 'backend', 'assessment-service'),
  script: 'dist/main.js',
  env: {
    NODE_ENV: 'production',
    PORT: 5000,
  },
}
```

Secrets should remain outside Git.

## Safe Fix Order

Use this order to avoid taking production down.

### Step 1: Fix GitHub Actions deploy conditions locally

Edit:

```text
.github/workflows/deploy.yml
```

Add `!cancelled() && !failure()` to each `deploy-*` job `if:` condition.

Commit and push to `develop` through normal PR/merge process.

### Step 2: Validate production `.env` files without printing secrets

Run on VPS:

```bash
cd /home/OriginBi-Technical

node <<'NODE'
const fs = require('fs');
const dotenv = require('/home/OriginBi-Technical/backend/node_modules/dotenv');
for (const f of [
  '/home/OriginBi-Technical/backend/assessment-service/.env',
  '/home/OriginBi-Technical/backend/exam-engine/.env',
  '/home/OriginBi-Technical/backend/tech-assessment-engine/.env',
]) {
  const parsed = dotenv.parse(fs.readFileSync(f, 'utf8'));
  console.log(f.replace('/home/OriginBi-Technical/', './'));
  console.log(Object.keys(parsed).sort().join(',') || 'NO_DOTENV_KEYS');
}
NODE
```

Expected: each service should print a useful list of keys, not `NO_DOTENV_KEYS`.

### Step 3: Fix systemd EnvironmentFile paths

Only after `.env` files parse correctly:

```bash
sed -i 's|/home/OriginBi-Technical/backend/exam-engine/.env.local|/home/OriginBi-Technical/backend/exam-engine/.env|' /etc/systemd/system/exam-engine.service
sed -i 's|/home/OriginBi-Technical/backend/tech-assessment-engine/.env.local|/home/OriginBi-Technical/backend/tech-assessment-engine/.env|' /etc/systemd/system/tech-assessment-engine.service
systemctl daemon-reload
```

### Step 4: Restart backend services carefully

Restart one service at a time and verify health before moving on.

Exam engine:

```bash
systemctl restart exam-engine
systemctl status exam-engine --no-pager
journalctl -u exam-engine -n 80 --no-pager
```

Tech assessment engine:

```bash
systemctl restart tech-assessment-engine
systemctl status tech-assessment-engine --no-pager
journalctl -u tech-assessment-engine -n 80 --no-pager
```

Assessment service:

```bash
cd /home/OriginBi-Technical/backend
npm run build --workspace=shared
npm run build --workspace=assessment-service
pm2 reload assessment-service --update-env || pm2 start /home/OriginBi-Technical/ecosystem.config.js --only assessment-service
pm2 describe assessment-service
pm2 logs assessment-service --lines 80
```

### Step 5: Verify live process env keys without exposing values

Run:

```bash
check_pid() {
  name="$1"
  pid="$2"
  echo "PROCESS:$name PID:$pid"
  if [ -z "$pid" ] || [ "$pid" = "0" ] || [ ! -r "/proc/$pid/environ" ]; then
    echo "NO_ENV_READ"
    return
  fi
  tr '\0' '\n' < "/proc/$pid/environ" \
    | awk -F= '/^[A-Za-z_][A-Za-z0-9_]*=/ {print $1}' \
    | sort \
    | grep -E '^(NODE_ENV|PORT|DB_|DATABASE_URL|ALLOWED_ORIGINS|RUN_MIGRATIONS|TECH_FRONTEND_URL|STUDENT_SERVICE_URL|ASSESSMENT_SERVICE_URL|COGNITO_|APP_ENV|COOKIE_|HTTP_ADDR|JUDGE0_URL|BOOTSTRAP_ADMIN_TOKEN|NEXT_PUBLIC_)' || true
}

check_pid assessment-service "$(pm2 pid assessment-service 2>/dev/null | tail -n 1)"
check_pid exam-engine "$(systemctl show -p MainPID --value exam-engine)"
check_pid tech-assessment-engine "$(systemctl show -p MainPID --value tech-assessment-engine)"
```

Expected:

- `assessment-service` should show DB/service-related keys if it relies on process env.
- `exam-engine` should show `DATABASE_URL`, Cognito keys, `JUDGE0_URL`, etc.
- `tech-assessment-engine` should show DB keys or `DATABASE_URL`.

## Vercel Frontend Env Check

Since the real frontend is hosted on Vercel, do not use the VPS frontend as the source of truth.

Check Vercel production environment variables:

```bash
vercel env ls production
```

Important frontend envs likely include:

```text
NEXT_PUBLIC_EXAM_ENGINE_URL
NEXT_PUBLIC_ASSESSMENT_SERVICE_URL
NEXT_PUBLIC_AUTH_SERVICE_URL
NEXT_PUBLIC_STUDENT_SERVICE_URL
NEXT_PUBLIC_JUDGE0_URL
NEXT_PUBLIC_COGNITO_REGION
NEXT_PUBLIC_COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_APP_CLIENT_ID
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID
NEXT_PUBLIC_RAZORPAY
```

After changing Vercel envs, redeploy the frontend. Next.js public envs are baked into the build.

## Rollback Plan

If a service fails after changing env paths:

1. Restore the previous systemd unit path:

```ini
EnvironmentFile=/home/OriginBi-Technical/backend/exam-engine/.env.local
```

2. Restore compatibility symlink if needed:

```bash
ln -sfn /home/OriginBi-Technical/backend/exam-engine/.env /home/OriginBi-Technical/backend/exam-engine/.env.local
ln -sfn /home/OriginBi-Technical/backend/tech-assessment-engine/.env /home/OriginBi-Technical/backend/tech-assessment-engine/.env.local
```

3. Reload systemd:

```bash
systemctl daemon-reload
```

4. Restart the affected service:

```bash
systemctl restart exam-engine
systemctl restart tech-assessment-engine
```

5. Check logs:

```bash
journalctl -u exam-engine -n 100 --no-pager
journalctl -u tech-assessment-engine -n 100 --no-pager
pm2 logs assessment-service --lines 100
```

## Recommended Final State

The production setup should end up like this:

```text
GitHub Actions:
  push to develop
    -> verify changed services
    -> sync VPS checkout
    -> rebuild/restart only changed services

VPS:
  /home/OriginBi-Technical/backend/exam-engine/.env
  /home/OriginBi-Technical/backend/tech-assessment-engine/.env
  /home/OriginBi-Technical/backend/assessment-service/.env

systemd:
  exam-engine uses backend/exam-engine/.env
  tech-assessment-engine uses backend/tech-assessment-engine/.env

PM2:
  assessment-service starts from backend/assessment-service
  assessment-service has valid production envs available

Vercel:
  production frontend envs configured in Vercel
  frontend redeployed after any NEXT_PUBLIC_* env change
```

## Bottom Line

The immediate reason updates were not reflected is that GitHub Actions synced code to the VPS but skipped the actual deploy/rebuild jobs.

The immediate env risk is that `.env.local` was renamed to `.env`, but systemd still references `.env.local`, and the new `.env` files did not parse as valid dotenv files. Fix the file contents first, then update systemd paths, then restart services one by one.
