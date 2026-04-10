module.exports = {
  apps: [
    {
      name: 'rredating-api',
      script: './dist/src/index.js',
      cwd: '/opt/rredating/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: '/var/log/rredating/error.log',
      out_file: '/var/log/rredating/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
