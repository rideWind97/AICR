const axios = require('axios');
const BaseAIProvider = require('./baseProvider');

/**
 * Gemini AI提供者
 */
class GeminiProvider extends BaseAIProvider {
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
        `${this.apiURL}/models/${this.model}:generateContent`,
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
      'x-goog-api-key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 构建请求体
   * @param {Array} messages - 消息数组
   * @returns {Object} 请求体对象
   */
  buildRequestBody(messages) {
    // Gemini使用不同的消息格式
    const systemMessage = messages.find(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user');
    
    let content = '';
    if (systemMessage) {
      content += `${systemMessage.content}\n\n`;
    }
    
    userMessages.forEach(msg => {
      content += `${msg.content}\n\n`;
    });

    return {
      contents: [
        {
          parts: [
            {
              text: content.trim()
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature
      }
    };
  }

  /**
   * 解析AI响应
   * @param {Object} response - AI API响应
   * @returns {string} 解析后的文本内容
   */
  parseResponse(response) {
    if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
      throw new Error('Gemini API响应格式错误');
    }
    
    return {
      content: response.candidates[0].content.parts[0].text,
      usage: response.usageMetadata,
      model: this.model
    };
  }
}

module.exports = GeminiProvider;
