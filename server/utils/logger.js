/**
 * 结构化日志工具
 */
class Logger {
  /**
   * 格式化日志消息
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   * @returns {string} 格式化的日志字符串
   */
  static format(level, message, data = {}) {
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...data
    };
    
    return JSON.stringify(logEntry);
  }
  
  /**
   * 信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  static info(message, data = {}) {
    console.log(this.format('info', message, data));
  }
  
  /**
   * 警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  static warn(message, data = {}) {
    console.warn(this.format('warn', message, data));
  }
  
  /**
   * 错误级别日志
   * @param {string} message - 日志消息
   * @param {Error|Object} error - 错误对象或额外数据
   */
  static error(message, error = {}) {
    let data = error;
    
    if (error instanceof Error) {
      data = {
        error: error.message,
        stack: error.stack,
        name: error.name
      };
      
      if (error.response) {
        data.response = {
          status: error.response.status,
          data: error.response.data
        };
      }
    }
    
    console.error(this.format('error', message, data));
  }
  
  /**
   * 调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} data - 额外数据
   */
  static debug(message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.format('debug', message, data));
    }
  }
  
  /**
   * 性能日志
   * @param {string} operation - 操作名称
   * @param {number} startTime - 开始时间
   * @param {Object} additionalData - 额外数据
   */
  static performance(operation, startTime, additionalData = {}) {
    const duration = Date.now() - startTime;
    this.info(`${operation} 完成`, {
      operation,
      duration: `${duration}ms`,
      ...additionalData
    });
  }
  
  /**
   * 开始性能计时
   * @param {string} operation - 操作名称
   * @returns {number} 开始时间戳
   */
  static startTimer(operation) {
    this.debug(`${operation} 开始`);
    return Date.now();
  }
  
  /**
   * 结束性能计时
   * @param {string} operation - 操作名称
   * @param {number} startTime - 开始时间
   * @param {Object} additionalData - 额外数据
   */
  static endTimer(operation, startTime, additionalData = {}) {
    this.performance(operation, startTime, additionalData);
  }
}

module.exports = Logger;
