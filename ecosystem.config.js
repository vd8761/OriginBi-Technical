const path = require('path');
const ROOT = __dirname;

/**
 * PM2 process list for the Node services. The two Go services run under
 * systemd instead (see deploy/systemd/), and Judge0 under Docker Compose.
 *
 * `instances`/`exec_mode` are set explicitly: PM2 defaults to a single fork,
 * so both services previously ran as one process on a multi-core droplet and a
 * restart was a hard outage rather than a rolling one. Cluster mode also makes
 * `pm2 reload` zero-downtime, which is what the deploy workflow calls.
 *
 * Neither service holds in-process state that a second worker would break:
 * sessions live in Cognito, attempt state in Postgres, and the throttler's
 * per-IP counters are advisory.
 */
module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: path.join(ROOT, 'frontend'),
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '600M',
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'assessment-service',
      cwd: path.join(ROOT, 'backend', 'assessment-service'),
      script: 'dist/main.js',
      // One instance: this service applies the SQL migrations at boot. A second
      // worker racing the migrator on deploy is a needless risk for a service
      // that is not CPU-bound.
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '600M',
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'auth-service',
      cwd: path.join(ROOT, 'backend', 'auth-service'),
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,
    },
  ],
};
