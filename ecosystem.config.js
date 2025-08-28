module.exports = {
  apps: [
    {
      name: 'ai-code-reviewer',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 健康检查
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // 进程管理
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 环境变量
      env_file: '.env'
    }
  ],
  
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/master',
      repo: 'git@github.com:username/ai-code-reviewer.git',
      path: '/var/www/ai-code-reviewer',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
