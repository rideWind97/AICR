/**
 * 应用配置文件
 */
module.exports = {
  gitlab: {
    url: process.env.GITLAB_URL,
    token: process.env.BOT_TOKEN,
    timeout: parseInt(process.env.GITLAB_TIMEOUT) || 1000000,
    maxRetries: parseInt(process.env.GITLAB_MAX_RETRIES) || 3
  },
  ai: {
    apiKey: process.env.AI_API_KEY,
    apiURL: process.env.AI_API_URL,
    model: process.env.AI_MODEL || 'qwen-plus',
    maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE) || 0.3,
    timeout: parseInt(process.env.DEEPSEEK_TIMEOUT) || 3000000
  },
  server: {
    port: parseInt(process.env.PORT) || 3001,
    host: process.env.HOST || '0.0.0.0'
  },
  review: {
    maxLinesPerBatch: parseInt(process.env.MAX_LINES_PER_BATCH) || 50,
    maxFilesConcurrent: parseInt(process.env.MAX_FILES_CONCURRENT) || 3,
    minLinesToReview: parseInt(process.env.MIN_LINES_TO_REVIEW) || 3,
    enableInlineComments: process.env.ENABLE_INLINE_COMMENTS !== 'false',
    addSummaryComment: process.env.ADD_SUMMARY_COMMENT !== 'false'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableDebugLogs: process.env.ENABLE_DEBUG_LOGS === 'true'
  }
};
