const OpenAIProvider = require('./openai');
const ClaudeProvider = require('./claude');
const DeepSeekProvider = require('./deepseek');
const QwenProvider = require('./qwen');
const GeminiProvider = require('./gemini');

// 支持的AI模型配置
const SUPPORTED_MODELS = {
  // OpenAI模型
  'gpt-4': OpenAIProvider,
  'gpt-4-turbo': OpenAIProvider,
  'gpt-3.5-turbo': OpenAIProvider,
  
  // Claude模型
  'claude-3-sonnet': ClaudeProvider,
  'claude-3-haiku': ClaudeProvider,
  'claude-3-opus': ClaudeProvider,
  
  // DeepSeek模型
  'deepseek-coder': DeepSeekProvider,
  'deepseek-chat': DeepSeekProvider,
  
  // Qwen模型
  'qwen-turbo': QwenProvider,
  'qwen-plus': QwenProvider,
  'qwen-max': QwenProvider,
  
  // Gemini模型
  'gemini-pro': GeminiProvider,
  'gemini-pro-vision': GeminiProvider
};

/**
 * 获取AI提供者实例
 * @param {string} model - 模型名称
 * @param {Object} config - 配置对象
 * @returns {Object} AI提供者实例
 */
function getAIProvider(model, config) {
  const ProviderClass = SUPPORTED_MODELS[model];
  
  if (!ProviderClass) {
    throw new Error(`不支持的AI模型: ${model}`);
  }
  
  return new ProviderClass(config);
}

/**
 * 获取所有支持的模型列表
 * @returns {Array} 支持的模型名称数组
 */
function getSupportedModels() {
  return Object.keys(SUPPORTED_MODELS);
}

/**
 * 验证模型是否支持
 * @param {string} model - 模型名称
 * @returns {boolean} 是否支持
 */
function isModelSupported(model) {
  return SUPPORTED_MODELS.hasOwnProperty(model);
}

module.exports = {
  getAIProvider,
  getSupportedModels,
  isModelSupported,
  SUPPORTED_MODELS
};
