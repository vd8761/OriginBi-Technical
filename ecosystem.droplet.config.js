// PM2 process list for THIS droplet (1 vCPU / 2 GB, SGP1).
//
// Differs from ecosystem.config.js on purpose:
//   * no `frontend` — Next.js is on Vercel (evaluation.originbi.com)
//   * every service is fork x1, not cluster x2. On a single core a second
//     worker competes for the same CPU rather than adding throughput. Memory
//     is no longer the binding constraint (the box was resized to 2 GB), but
//     the single core still is. nginx's upstream blocks are already written
//     to take extra replicas when the box grows.
//   * exam-engine runs under systemd, not here.
const path = require('path');
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'assessment-service',
      cwd: path.join(ROOT, 'backend', 'assessment-service'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      // Leaves room for the Go engine + nginx + OS inside 961 MB.
      max_memory_restart: '280M',
      node_args: '--max-old-space-size=256',
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      error_file: '/var/log/originbi/assessment-error.log',
      out_file: '/var/log/originbi/assessment-out.log',
    },
    {
      name: 'auth-service',
      cwd: path.join(ROOT, 'backend', 'auth-service'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '220M',
      node_args: '--max-old-space-size=200',
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      error_file: '/var/log/originbi/auth-error.log',
      out_file: '/var/log/originbi/auth-out.log',
    },
  ],
};
