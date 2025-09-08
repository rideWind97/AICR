/**
 * 统一错误处理工具类
 */
const Logger = require("../../utils/logger");

class ErrorHandler {
  /**
   * 处理AI API错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @returns {Object} 处理后的错误信息
   */
  static handleApiError(error, context = "AI API调用") {
    const errorInfo = {
      context,
      message: error.message,
      type: "API_ERROR",
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      // API响应错误
      errorInfo.status = error.response.status;
      errorInfo.data = error.response.data;
      errorInfo.type = "API_RESPONSE_ERROR";
      
      Logger.error(`${context} - API响应错误`, {
        status: error.response.status,
        data: error.response.data,
        message: error.message,
      });
    } else if (error.request) {
      // 网络请求错误
      errorInfo.type = "NETWORK_ERROR";
      
      Logger.error(`${context} - 网络请求失败`, {
        message: error.message,
        code: error.code,
      });
    } else {
      // 其他错误
      Logger.error(`${context} - 未知错误`, {
        message: error.message,
        stack: error.stack,
      });
    }

    return errorInfo;
  }

  /**
   * 处理文件处理错误
   * @param {Error} error - 错误对象
   * @param {string} fileName - 文件名
   * @param {string} context - 错误上下文
   * @returns {Object} 处理后的错误信息
   */
  static handleFileError(error, fileName, context = "文件处理") {
    const errorInfo = {
      context,
      fileName,
      message: error.message,
      type: "FILE_ERROR",
      timestamp: new Date().toISOString(),
    };

    Logger.error(`${context} - 文件处理失败`, {
      fileName,
      message: error.message,
      stack: error.stack,
    });

    return errorInfo;
  }

  /**
   * 处理缓存错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @returns {Object} 处理后的错误信息
   */
  static handleCacheError(error, context = "缓存操作") {
    const errorInfo = {
      context,
      message: error.message,
      type: "CACHE_ERROR",
      timestamp: new Date().toISOString(),
    };

    Logger.warn(`${context} - 缓存操作失败`, {
      message: error.message,
    });

    return errorInfo;
  }

  /**
   * 处理配置错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @returns {Object} 处理后的错误信息
   */
  static handleConfigError(error, context = "配置错误") {
    const errorInfo = {
      context,
      message: error.message,
      type: "CONFIG_ERROR",
      timestamp: new Date().toISOString(),
    };

    Logger.error(`${context}`, {
      message: error.message,
      stack: error.stack,
    });

    return errorInfo;
  }

  /**
   * 包装异步函数，提供统一错误处理
   * @param {Function} asyncFn - 异步函数
   * @param {string} context - 错误上下文
   * @param {*} defaultValue - 默认返回值
   * @returns {Function} 包装后的函数
   */
  static wrapAsync(asyncFn, context, defaultValue = null) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const errorInfo = this.handleApiError(error, context);
        Logger.error(`${context} - 异步函数执行失败`, errorInfo);
        return defaultValue;
      }
    };
  }

  /**
   * 检查是否为可恢复的错误
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否可恢复
   */
  static isRecoverableError(error) {
    if (error.response) {
      // 4xx错误通常不可恢复，5xx错误可能可恢复
      return error.response.status >= 500;
    }
    
    // 网络错误通常可恢复
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  /**
   * 获取错误重试延迟时间（指数退避）
   * @param {number} attempt - 重试次数
   * @param {number} baseDelay - 基础延迟时间（毫秒）
   * @returns {number} 延迟时间
   */
  static getRetryDelay(attempt, baseDelay = 1000) {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // 最大30秒
  }
}

module.exports = ErrorHandler;
