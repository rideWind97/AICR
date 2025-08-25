const { getAIProvider, getSupportedModels, isModelSupported } = require('./aiProviders');
const Logger = require('../utils/logger');

/**
 * AI模型管理服务
 * 负责管理多个AI模型，支持动态切换和配置管理
 */
class ModelManager {
  constructor() {
    this.currentModel = process.env.AI_MODEL || 'deepseek-coder';
    this.modelConfigs = new Map();
    this.activeProviders = new Map();
    this.modelStats = new Map();
    
    // 初始化支持的模型配置
    this.initializeModelConfigs();
    
    // 初始化当前模型
    this.initializeCurrentModel();
  }

  /**
   * 初始化所有支持的模型配置
   */
  initializeModelConfigs() {
    const models = getSupportedModels();
    
    models.forEach(model => {
      const config = this.createModelConfig(model);
      this.modelConfigs.set(model, config);
    });
    
    Logger.info('模型配置初始化完成', { 
      totalModels: models.length,
      models: models 
    });
  }

  /**
   * 为指定模型创建配置
   * @param {string} model - 模型名称
   * @returns {Object} 模型配置
   */
  createModelConfig(model) {
    const baseConfig = {
      model: model,
      maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
      timeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 6000
    };

    // 根据模型类型设置不同的配置
    if (model.startsWith('gpt-')) {
      return {
        ...baseConfig,
        apiKey: process.env.OPENAI_API_KEY,
        apiURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
        provider: 'OpenAI'
      };
    } else if (model.startsWith('claude-')) {
      return {
        ...baseConfig,
        apiKey: process.env.CLAUDE_API_KEY,
        apiURL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1',
        provider: 'Claude'
      };
    } else if (model.startsWith('deepseek-')) {
      return {
        ...baseConfig,
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
        provider: 'DeepSeek'
      };
    } else if (model.startsWith('qwen-')) {
      return {
        ...baseConfig,
        apiKey: process.env.QWEN_API_KEY,
        apiURL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1',
        provider: 'Qwen'
      };
    } else if (model.startsWith('gemini-')) {
      return {
        ...baseConfig,
        apiKey: process.env.GEMINI_API_KEY,
        apiURL: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
        provider: 'Gemini'
      };
    } else {
      throw new Error(`不支持的模型: ${model}`);
    }
  }

  /**
   * 初始化当前模型
   */
  initializeCurrentModel() {
    try {
      if (!isModelSupported(this.currentModel)) {
        Logger.warn(`当前模型 ${this.currentModel} 不支持，切换到默认模型`);
        this.currentModel = 'deepseek-coder';
      }

      const config = this.modelConfigs.get(this.currentModel);
      if (!config) {
        throw new Error(`模型配置不存在: ${this.currentModel}`);
      }

      // 验证配置完整性
      this.validateModelConfig(config);

      // 创建提供者实例
      const provider = getAIProvider(this.currentModel, config);
      this.activeProviders.set(this.currentModel, provider);

      // 初始化模型统计
      this.modelStats.set(this.currentModel, {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        totalTokens: 0,
        lastUsed: Date.now()
      });

      Logger.info('当前模型初始化成功', {
        model: this.currentModel,
        provider: provider.constructor.name,
        config: {
          apiURL: config.apiURL,
          maxTokens: config.maxTokens,
          temperature: config.temperature
        }
      });

    } catch (error) {
      Logger.error('当前模型初始化失败', error);
      throw error;
    }
  }

  /**
   * 验证模型配置
   * @param {Object} config - 模型配置
   * @throws {Error} 配置验证失败时抛出错误
   */
  validateModelConfig(config) {
    if (!config.apiKey) {
      throw new Error(`模型 ${config.model} 缺少API密钥`);
    }
    if (!config.apiURL) {
      throw new Error(`模型 ${config.model} 缺少API地址`);
    }
    if (!config.model) {
      throw new Error(`模型 ${config.model} 缺少模型名称`);
    }
  }

  /**
   * 切换AI模型
   * @param {string} model - 新模型名称
   * @returns {boolean} 切换是否成功
   */
  switchModel(model) {
    try {
      if (!isModelSupported(model)) {
        throw new Error(`不支持的模型: ${model}`);
      }

      if (model === this.currentModel) {
        Logger.info('模型已经是当前模型，无需切换', { model });
        return true;
      }

      const config = this.modelConfigs.get(model);
      if (!config) {
        throw new Error(`模型配置不存在: ${model}`);
      }

      // 验证新模型配置
      this.validateModelConfig(config);

      // 创建新的提供者实例
      const provider = getAIProvider(model, config);
      
      // 更新当前模型
      this.currentModel = model;
      this.activeProviders.set(model, provider);

      // 初始化新模型的统计信息
      if (!this.modelStats.has(model)) {
        this.modelStats.set(model, {
          requestCount: 0,
          successCount: 0,
          errorCount: 0,
          totalTokens: 0,
          lastUsed: Date.now()
        });
      }

      Logger.info('AI模型切换成功', { 
        oldModel: this.currentModel, 
        newModel: model,
        provider: provider.constructor.name
      });

      return true;

    } catch (error) {
      Logger.error('AI模型切换失败', error);
      return false;
    }
  }

  /**
   * 获取当前模型
   * @returns {Object} 当前模型信息
   */
  getCurrentModel() {
    const provider = this.activeProviders.get(this.currentModel);
    const config = this.modelConfigs.get(this.currentModel);
    const stats = this.modelStats.get(this.currentModel);

    return {
      model: this.currentModel,
      provider: provider ? provider.constructor.name : 'Unknown',
      config: config || {},
      stats: stats || {}
    };
  }

  /**
   * 获取所有支持的模型列表
   * @returns {Array} 支持的模型列表
   */
  getSupportedModels() {
    return getSupportedModels();
  }

  /**
   * 获取所有模型配置
   * @returns {Object} 所有模型配置
   */
  getAllModelConfigs() {
    const configs = {};
    
    for (const [model, config] of this.modelConfigs) {
      configs[model] = {
        ...config,
        isActive: model === this.currentModel,
        stats: this.modelStats.get(model) || {}
      };
    }
    
    return configs;
  }

  /**
   * 获取指定模型的提供者实例
   * @param {string} model - 模型名称
   * @returns {Object} AI提供者实例
   */
  getProvider(model = null) {
    const targetModel = model || this.currentModel;
    const provider = this.activeProviders.get(targetModel);
    
    if (!provider) {
      throw new Error(`模型 ${targetModel} 的提供者未初始化`);
    }
    
    return provider;
  }

  /**
   * 更新模型统计信息
   * @param {string} model - 模型名称
   * @param {Object} stats - 统计信息
   */
  updateModelStats(model, stats) {
    const currentStats = this.modelStats.get(model) || {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      totalTokens: 0,
      lastUsed: Date.now()
    };

    // 更新统计信息
    currentStats.requestCount += stats.requestCount || 0;
    currentStats.successCount += stats.successCount || 0;
    currentStats.errorCount += stats.errorCount || 0;
    currentStats.totalTokens += stats.totalTokens || 0;
    currentStats.lastUsed = Date.now();

    this.modelStats.set(model, currentStats);
  }

  /**
   * 获取模型性能统计
   * @param {string} model - 模型名称
   * @returns {Object} 性能统计信息
   */
  getModelStats(model = null) {
    const targetModel = model || this.currentModel;
    return this.modelStats.get(targetModel) || {};
  }

  /**
   * 检查模型是否可用
   * @param {string} model - 模型名称
   * @returns {boolean} 模型是否可用
   */
  isModelAvailable(model) {
    try {
      const config = this.modelConfigs.get(model);
      if (!config) {
        return false;
      }

      // 检查配置完整性
      this.validateModelConfig(config);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取推荐模型列表
   * @returns {Array} 推荐模型列表
   */
  getRecommendedModels() {
    const availableModels = [];
    
    for (const [model, config] of this.modelConfigs) {
      if (this.isModelAvailable(model)) {
        availableModels.push({
          model,
          provider: config.provider,
          isActive: model === this.currentModel
        });
      }
    }
    
    // 按推荐程度排序
    const priorityOrder = {
      'deepseek-coder': 1,
      'gpt-4': 2,
      'claude-3-sonnet': 3,
      'qwen-turbo': 4,
      'gemini-pro': 5
    };
    
    return availableModels.sort((a, b) => {
      const priorityA = priorityOrder[a.model] || 999;
      const priorityB = priorityOrder[b.model] || 999;
      return priorityA - priorityB;
    });
  }

  /**
   * 重新加载模型配置
   */
  reloadConfigs() {
    try {
      this.modelConfigs.clear();
      this.initializeModelConfigs();
      
      Logger.info('模型配置重新加载完成');
      return true;
    } catch (error) {
      Logger.error('模型配置重新加载失败', error);
      return false;
    }
  }

  /**
   * 清理不活跃的提供者
   */
  cleanupInactiveProviders() {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30分钟
    
    for (const [model, provider] of this.activeProviders) {
      if (model !== this.currentModel) {
        const stats = this.modelStats.get(model);
        if (stats && (now - stats.lastUsed) > inactiveThreshold) {
          this.activeProviders.delete(model);
          Logger.info(`清理不活跃的模型提供者: ${model}`);
        }
      }
    }
  }
}

module.exports = ModelManager;
