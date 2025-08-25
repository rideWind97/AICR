const axios = require('axios');
const BaseAIProvider = require('./baseProvider');

/**
 * OpenAI AI提供者
 */
class OpenAIProvider extends BaseAIProvider {
  constructor(config) {
    super(config);
    this.validateConfig();
  }

  /**
   * 生成代码审查
   * @param {Array} messages - 消息数组
   * @returns {Promise<Object>} AI响应结果
   */
  async generateReview(messages) {
    try {
      const headers = this.buildHeaders();
      const requestBody = this.buildRequestBody(messages);

      const response = await axios.post(
        `${this.apiURL}/chat/completions`,
        requestBody,
        {
          headers,
          timeout: this.timeout
        }
      );

      return this.parseResponse(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 构建请求头
   * @returns {Object} 请求头对象
   */
  buildHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 构建请求体
   * @param {Array} messages - 消息数组
   * @returns {Object} 请求体对象
   */
  buildRequestBody(messages) {
    return {
      model: this.model,
      messages: messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: false
    };
  }

  /**
   * 解析AI响应
   * @param {Object} response - AI API响应
   * @returns {string} 解析后的文本内容
   */
  parseResponse(response) {
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('OpenAI API响应格式错误');
    }
    
    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model
    };
  }
}

module.exports = OpenAIProvider;
