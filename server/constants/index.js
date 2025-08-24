/**
 * 应用常量定义
 */
module.exports = {
  GITLAB: {
    API_TIMEOUT: 1000000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    SUPPORTED_ACTIONS: ['open', 'reopen', 'update'],
    SUPPORTED_EVENTS: ['merge_request', 'push']
  },
  AI: {
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.3,
    TIMEOUT: 3000000,
    MAX_REVIEW_LENGTH: 200,
    MIN_REVIEW_LENGTH: 15
  },
  CACHE: {
    TTL: 5 * 60 * 1000, // 5分钟
    MAX_SIZE: 100
  },
  REVIEW: {
    MAX_LINES_PER_BATCH: 50,
    MAX_FILES_CONCURRENT: 3,
    MIN_LINES_TO_REVIEW: 3,
    API_DELAY_MS: 100,
    SIMILARITY_THRESHOLD: 0.05
  },
  HTTP: {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
  }
};
