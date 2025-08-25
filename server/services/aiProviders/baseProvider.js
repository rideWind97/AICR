/**
 * AI提供者基类
 * 定义所有AI提供者必须实现的接口
 */
class BaseAIProvider {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey;
    this.apiURL = config.apiURL;
    this.model = config.model;
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.3;
    this.timeout = config.timeout || 30000;
  }

  /**
   * 验证配置是否完整
   * @throws {Error} 配置不完整时抛出错误
   */
  validateConfig() {
    if (!this.apiKey) {
      throw new Error(`${this.constructor.name}: API密钥不能为空`);
    }
    if (!this.apiURL) {
      throw new Error(`${this.constructor.name}: API地址不能为空`);
    }
    if (!this.model) {
      throw new Error(`${this.constructor.name}: 模型名称不能为空`);
    }
  }

  /**
   * 生成代码审查
   * @param {Array} messages - 消息数组
   * @returns {Promise<Object>} AI响应结果
   */
  async generateReview(messages) {
    throw new Error('子类必须实现 generateReview 方法');
  }

  /**
   * 构建请求头
   * @returns {Object} 请求头对象
   */
  buildHeaders() {
    throw new Error('子类必须实现 buildHeaders 方法');
  }

  /**
   * 构建请求体
   * @param {Array} messages - 消息数组
   * @returns {Object} 请求体对象
   */
  buildRequestBody(messages) {
    throw new Error('子类必须实现 buildRequestBody 方法');
  }

  /**
   * 解析AI响应
   * @param {Object} response - AI API响应
   * @returns {string} 解析后的文本内容
   */
  parseResponse(response) {
    throw new Error('子类必须实现 parseResponse 方法');
  }

  /**
   * 处理API错误
   * @param {Error} error - 错误对象
   * @throws {Error} 重新抛出格式化的错误
   */
  handleError(error) {
    const providerName = this.constructor.name;
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      throw new Error(`${providerName} API错误 (${status}): ${data?.error?.message || data?.message || '未知错误'}`);
    } else if (error.request) {
      throw new Error(`${providerName} 网络错误: 无法连接到API服务器`);
    } else {
      throw new Error(`${providerName} 错误: ${error.message}`);
    }
  }

  /**
   * 获取提供者信息
   * @returns {Object} 提供者信息
   */
  getProviderInfo() {
    return {
      name: this.constructor.name,
      model: this.model,
      apiURL: this.apiURL,
      maxTokens: this.maxTokens,
      temperature: this.temperature
    };
  }
}

module.exports = BaseAIProvider;
