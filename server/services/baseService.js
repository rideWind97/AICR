const config = require('../config');
const Logger = require('../utils/logger');

/**
 * 基础服务类，提供通用功能
 */
class BaseService {
  constructor() {
    this.config = config;
  }
  
  /**
   * 统一错误处理
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {Object} additionalData - 额外数据
   */
  handleError(error, context, additionalData = {}) {
    const errorInfo = {
      message: error.message,
      context,
      timestamp: new Date().toISOString(),
      ...additionalData
    };
    
    if (error.response) {
      errorInfo.status = error.response.status;
      errorInfo.data = error.response.data;
    }
    
    Logger.error(`${context} 失败`, error, errorInfo);
    throw error;
  }
  
  /**
   * 重试机制
   * @param {Function} fn - 要重试的函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试延迟（毫秒）
   */
  async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) {
          throw error;
        }
        
        Logger.warn('重试操作', null, {
          attempt: i + 1,
          maxRetries,
          delay,
          error: error.message
        });
        
        await this.sleep(delay);
        delay *= 2; // 指数退避
      }
    }
    
    throw lastError;
  }
  
  /**
   * 延迟函数
   * @param {number} ms - 延迟毫秒数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 验证配置
   * @param {string} serviceName - 服务名称
   */
  validateConfig(serviceName) {
    const serviceConfig = this.config[serviceName];
    if (!serviceConfig) {
      Logger.error('配置验证失败', null, { serviceName });
      throw new Error(`缺少 ${serviceName} 配置`);
    }
    
    return serviceConfig;
  }
}

module.exports = BaseService;
