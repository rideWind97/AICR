const axios = require('axios');
const BaseAIProvider = require('./baseProvider');

/**
 * Claude AI提供者
 */
class ClaudeProvider extends BaseAIProvider {
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
        `${this.apiURL}/messages`,
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
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    };
  }

  /**
   * 构建请求体
   * @param {Array} messages - 消息数组
   * @returns {Object} 请求体对象
   */
  buildRequestBody(messages) {
    // Claude使用不同的消息格式
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    let content = '';
    if (systemMessage) {
      content += `系统指令: ${systemMessage.content}\n\n`;
    }
    
    userMessages.forEach(msg => {
      content += `用户: ${msg.content}\n\n`;
    });

    return {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: content.trim()
        }
      ]
    };
  }

  /**
   * 解析AI响应
   * @param {Object} response - AI API响应
   * @returns {string} 解析后的文本内容
   */
  parseResponse(response) {
    if (!response.content || !response.content[0] || !response.content[0].text) {
      throw new Error('Claude API响应格式错误');
    }
    
    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model
    };
  }
}

module.exports = ClaudeProvider;
