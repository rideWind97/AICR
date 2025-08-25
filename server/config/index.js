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
  github: {
    token: process.env.GITHUB_TOKEN,
    apiURL: process.env.GITHUB_API_URL || 'https://api.github.com',
    timeout: parseInt(process.env.GITHUB_TIMEOUT) || 10000,
    maxRetries: parseInt(process.env.GITHUB_MAX_RETRIES) || 3,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET
  },
  ai: {
    // 多模型支持
    model: process.env.AI_MODEL || 'deepseek-coder',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
    timeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 6000,
    
    // 各模型配置
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      apiURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1'
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY,
      apiURL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1'
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      apiURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-coder',
      maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE) || 0.3,
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT) || 3000000
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY,
      apiURL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1'
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      apiURL: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta'
    }
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
