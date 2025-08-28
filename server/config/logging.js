/**
 * 日志配置
 */
module.exports = {
  // 日志级别
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  
  // 日志格式
  format: {
    timestamp: true,
    level: true,
    message: true,
    data: true,
    error: true
  },
  
  // 输出配置
  output: {
    console: true,
    file: false,
    filePath: './logs/app.log'
  },
  
  // 性能监控配置
  performance: {
    enabled: true,
    threshold: 1000, // 超过1秒记录性能日志
    includeMemory: true,
    includeCPU: false
  },
  
  // 敏感信息过滤
  filters: {
    // 不记录这些字段的值
    sensitiveFields: ['password', 'token', 'secret', 'key'],
    // 替换为占位符
    placeholder: '***'
  },
  
  // 环境相关配置
  environment: {
    development: {
      level: 'debug',
      format: 'detailed'
    },
    production: {
      level: 'info',
      format: 'compact'
    },
    test: {
      level: 'warn',
      format: 'minimal'
    }
  }
};
