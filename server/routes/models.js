const express = require('express');
const router = express.Router();
const ModelManager = require('../services/modelManager');
const Logger = require('../utils/logger');

// 初始化模型管理器
const modelManager = new ModelManager();

/**
 * 获取所有支持的AI模型
 * GET /api/models
 */
router.get('/', async (req, res) => {
  try {
    const models = modelManager.getSupportedModels();
    const availableModels = modelManager.getRecommendedModels();
    const currentModel = modelManager.getCurrentModel();
    
    res.json({
      success: true,
      data: {
        supported: models,
        available: availableModels,
        current: currentModel
      }
    });
  } catch (error) {
    Logger.error('获取模型列表失败', error);
    res.status(500).json({
      success: false,
      error: '获取模型列表失败',
      message: error.message
    });
  }
});

/**
 * 获取当前AI模型信息
 * GET /api/models/current
 */
router.get('/current', async (req, res) => {
  try {
    const currentModel = modelManager.getCurrentModel();
    
    res.json({
      success: true,
      data: currentModel
    });
  } catch (error) {
    Logger.error('获取当前模型失败', error);
    res.status(500).json({
      success: false,
      error: '获取当前模型失败',
      message: error.message
    });
  }
});

/**
 * 切换AI模型
 * POST /api/models/switch
 */
router.post('/switch', async (req, res) => {
  try {
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({
        success: false,
        error: '缺少模型参数',
        message: '请提供要切换的模型名称'
      });
    }
    
    const success = modelManager.switchModel(model);
    
    if (success) {
      const currentModel = modelManager.getCurrentModel();
      
      res.json({
        success: true,
        message: `模型切换成功: ${model}`,
        data: currentModel
      });
    } else {
      res.status(400).json({
        success: false,
        error: '模型切换失败',
        message: '无法切换到指定模型'
      });
    }
  } catch (error) {
    Logger.error('切换模型失败', error);
    res.status(500).json({
      success: false,
      error: '切换模型失败',
      message: error.message
    });
  }
});

/**
 * 获取模型配置信息
 * GET /api/models/configs
 */
router.get('/configs', async (req, res) => {
  try {
    const configs = modelManager.getAllModelConfigs();
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    Logger.error('获取模型配置失败', error);
    res.status(500).json({
      success: false,
      error: '获取模型配置失败',
      message: error.message
    });
  }
});

/**
 * 获取模型性能统计
 * GET /api/models/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { model } = req.query;
    const stats = modelManager.getModelStats(model);
    
    res.json({
      success: true,
      data: {
        model: model || 'current',
        stats: stats
      }
    });
  } catch (error) {
    Logger.error('获取模型统计失败', error);
    res.status(500).json({
      success: false,
      error: '获取模型统计失败',
      message: error.message
    });
  }
});

/**
 * 检查模型是否可用
 * GET /api/models/:model/available
 */
router.get('/:model/available', async (req, res) => {
  try {
    const { model } = req.params;
    const isAvailable = modelManager.isModelAvailable(model);
    
    res.json({
      success: true,
      data: {
        model: model,
        available: isAvailable
      }
    });
  } catch (error) {
    Logger.error('检查模型可用性失败', error);
    res.status(500).json({
      success: false,
      error: '检查模型可用性失败',
      message: error.message
    });
  }
});

/**
 * 重新加载模型配置
 * POST /api/models/reload
 */
router.post('/reload', async (req, res) => {
  try {
    const success = modelManager.reloadConfigs();
    
    if (success) {
      res.json({
        success: true,
        message: '模型配置重新加载成功'
      });
    } else {
      res.status(500).json({
        success: false,
        error: '模型配置重新加载失败'
      });
    }
  } catch (error) {
    Logger.error('重新加载模型配置失败', error);
    res.status(500).json({
      success: false,
      error: '重新加载模型配置失败',
      message: error.message
    });
  }
});

/**
 * 测试AI模型连接
 * POST /api/models/:model/test
 */
router.post('/:model/test', async (req, res) => {
  try {
    const { model } = req.params;
    
    if (!modelManager.isModelAvailable(model)) {
      return res.status(400).json({
        success: false,
        error: '模型不可用',
        message: `模型 ${model} 配置不完整或不可用`
      });
    }
    
    // 尝试创建提供者实例进行测试
    const provider = modelManager.getProvider(model);
    
    // 发送简单的测试请求
    const testMessages = [
      {
        role: "system",
        content: "你是一个AI助手。请回复'连接测试成功'。"
      },
      {
        role: "user",
        content: "请简单回复。"
      }
    ];
    
    try {
      const response = await provider.generateReview(testMessages);
      
      res.json({
        success: true,
        message: '模型连接测试成功',
        data: {
          model: model,
          response: response.content,
          provider: provider.constructor.name
        }
      });
    } catch (apiError) {
      res.status(400).json({
        success: false,
        error: '模型API调用失败',
        message: apiError.message,
        data: {
          model: model,
          provider: provider.constructor.name
        }
      });
    }
    
  } catch (error) {
    Logger.error('测试模型连接失败', error);
    res.status(500).json({
      success: false,
      error: '测试模型连接失败',
      message: error.message
    });
  }
});

module.exports = router;
