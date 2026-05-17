const path = require('path');
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: path.join(ROOT, 'frontend'),
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'assessment-service',
      cwd: path.join(ROOT, 'backend', 'assessment-service'),
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 5,
      restart_delay: 3000,
      watch: false,
    },
  ],
};
