module.exports = {
  apps: [
    {
      name: 'projectpg12',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: '/home/sadm/projectpg12/logs/pm2-error.log',
      out_file: '/home/sadm/projectpg12/logs/pm2-out.log',
      log_file: '/home/sadm/projectpg12/logs/pm2-combined.log',
      time: true,
      max_memory_restart: '500M',
      node_args: '--max_old_space_size=4096',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backup'],
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'projectpg12-worker',
      script: 'workers/scheduler.js',
      instances: 1,
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: '/home/sadm/projectpg12/logs/worker-error.log',
      out_file: '/home/sadm/projectpg12/logs/worker-out.log',
      log_file: '/home/sadm/projectpg12/logs/worker-combined.log',
      time: true,
      max_memory_restart: '200M',
      cron_restart: '0 2 * * *', // 每天凌晨2点重启
      watch: false
    }
  ],
  
  deploy: {
    production: {
      user: 'sadm',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/your-org/projectpg12.git',
      path: '/home/sadm/projectpg12',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run setup:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    staging: {
      user: 'sadm',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'https://github.com/your-org/projectpg12.git',
      path: '/home/sadm/projectpg12-staging',
      'post-deploy': 'npm install && npm run setup:prod && pm2 reload ecosystem.config.js --env production'
    }
  }
};