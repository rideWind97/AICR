const MultiModelAICodeReviewer = require('./multiModelAICodeReviewer');
const Logger = require('../utils/logger');

/**
 * 统一代码审查服务
 * 支持GitLab和GitHub，提供统一的代码审查接口
 */
class UnifiedCodeReviewer {
  constructor() {
    this.aiReviewer = new MultiModelAICodeReviewer();
    this.platforms = new Map();
    
    // 初始化支持的平台
    this.initializePlatforms();
  }

  /**
   * 初始化支持的平台
   */
  initializePlatforms() {
    this.platforms.set('gitlab', {
      name: 'GitLab',
      webhookPath: '/api/gitlab/webhook',
      reviewPath: '/api/gitlab/review',
      features: ['merge_request', 'push', 'comment']
    });

    this.platforms.set('github', {
      name: 'GitHub',
      webhookPath: '/api/github/webhook',
      reviewPath: '/api/github/review',
      features: ['pull_request', 'push', 'comment']
    });

    Logger.info('统一代码审查服务初始化完成', {
      platforms: Array.from(this.platforms.keys()),
      currentModel: this.aiReviewer.currentModel
    });
  }

  /**
   * 获取支持的平台信息
   * @returns {Object} 平台信息
   */
  getSupportedPlatforms() {
    const platformInfo = {};
    
    for (const [key, platform] of this.platforms) {
      platformInfo[key] = {
        ...platform,
        isActive: true
      };
    }
    
    return platformInfo;
  }

  /**
   * 获取当前AI模型信息
   * @returns {Object} 模型信息
   */
  getCurrentModel() {
    return this.aiReviewer.getCurrentModel();
  }

  /**
   * 切换AI模型
   * @param {string} model - 新模型名称
   * @returns {boolean} 切换是否成功
   */
  switchModel(model) {
    return this.aiReviewer.switchModel(model);
  }

  /**
   * 获取支持的AI模型列表
   * @returns {Array} 支持的模型列表
   */
  getSupportedModels() {
    return this.aiReviewer.getSupportedModels();
  }

  /**
   * 统一的代码审查接口
   * @param {Object} options - 审查选项
   * @returns {Promise<Object>} 审查结果
   */
  async reviewCode(options) {
    const {
      platform,        // 平台类型: 'gitlab' 或 'github'
      changes,         // 代码变更
      existingComments, // 现有评论
      metadata = {}    // 元数据
    } = options;

    try {
      Logger.info('开始统一代码审查', {
        platform,
        changeCount: changes?.length || 0,
        model: this.aiReviewer.currentModel,
        metadata
      });

      // 验证平台支持
      if (!this.platforms.has(platform)) {
        throw new Error(`不支持的平台: ${platform}`);
      }

      // 验证输入参数
      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        throw new Error('代码变更不能为空');
      }

      // 调用AI审查器
      const reviews = await this.aiReviewer.generateCodeReview(changes, existingComments);

      // 格式化审查结果
      const result = this.formatReviewResult(reviews, platform, metadata);

      Logger.info('统一代码审查完成', {
        platform,
        reviewCount: result.totalReviews,
        model: this.aiReviewer.currentModel
      });

      return result;

    } catch (error) {
      Logger.error('统一代码审查失败', error, {
        platform,
        changeCount: changes?.length || 0
      });
      
      throw error;
    }
  }

  /**
   * 格式化审查结果
   * @param {Array} reviews - AI审查结果
   * @param {string} platform - 平台类型
   * @param {Object} metadata - 元数据
   * @returns {Object} 格式化的结果
   */
  formatReviewResult(reviews, platform, metadata) {
    const result = {
      platform,
      timestamp: new Date().toISOString(),
      model: this.aiReviewer.currentModel,
      totalReviews: 0,
      fileReviews: [],
      summary: {
        totalFiles: 0,
        totalIssues: 0,
        severityBreakdown: {
          high: 0,
          medium: 0,
          low: 0
        }
      }
    };

    if (!reviews || reviews.length === 0) {
      return result;
    }

    result.totalReviews = reviews.length;
    result.fileReviews = reviews.map(fileReview => {
      const fileResult = {
        filePath: fileReview.filePath,
        reviewCount: fileReview.review?.length || 0,
        reviews: fileReview.review || [],
        metadata: {
          change: fileReview.change,
          ...metadata
        }
      };

      // 统计问题严重程度
      if (fileReview.review) {
        fileReview.review.forEach(review => {
          const severity = this.analyzeReviewSeverity(review.review);
          result.summary.severityBreakdown[severity]++;
          result.summary.totalIssues++;
        });
      }

      return fileResult;
    });

    result.summary.totalFiles = result.fileReviews.length;

    return result;
  }

  /**
   * 分析审查意见的严重程度
   * @param {string} review - 审查意见
   * @returns {string} 严重程度: 'high', 'medium', 'low'
   */
  analyzeReviewSeverity(review) {
    const reviewText = review.toLowerCase();
    
    // 高严重程度关键词
    const highSeverityKeywords = [
      '安全', 'security', '漏洞', 'vulnerability', '注入', 'injection',
      'xss', 'csrf', 'sql注入', 'sql injection', '权限', 'permission',
      '认证', 'authentication', '授权', 'authorization', '敏感', 'sensitive'
    ];

    // 中严重程度关键词
    const mediumSeverityKeywords = [
      '性能', 'performance', '内存', 'memory', '泄漏', 'leak',
      '死锁', 'deadlock', '竞态', 'race condition', '并发', 'concurrency',
      '异常', 'exception', '错误处理', 'error handling'
    ];

    // 检查严重程度
    if (highSeverityKeywords.some(keyword => reviewText.includes(keyword))) {
      return 'high';
    } else if (mediumSeverityKeywords.some(keyword => reviewText.includes(keyword))) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 生成审查摘要
   * @param {Object} reviewResult - 审查结果
   * @returns {string} 审查摘要
   */
  generateReviewSummary(reviewResult) {
    const { summary, model, platform } = reviewResult;
    
    let summaryText = `## 🤖 AI代码审查摘要\n\n`;
    
    if (summary.totalIssues === 0) {
      summaryText += `✅ **代码质量优秀！** 本次审查未发现需要改进的问题。\n\n`;
    } else {
      summaryText += `📊 **审查统计**\n`;
      summaryText += `- 审查文件数: ${summary.totalFiles}\n`;
      summaryText += `- 发现问题数: ${summary.totalIssues}\n`;
      summaryText += `- 高严重程度: ${summary.severityBreakdown.high}\n`;
      summaryText += `- 中严重程度: ${summary.severityBreakdown.medium}\n`;
      summaryText += `- 低严重程度: ${summary.severityBreakdown.low}\n\n`;
    }

    summaryText += `**审查平台**: ${platform === 'gitlab' ? 'GitLab' : 'GitHub'}\n`;
    summaryText += `**AI模型**: ${model}\n`;
    summaryText += `**审查时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;

    if (summary.totalIssues > 0) {
      summaryText += `> 💡 请仔细查看每个建议，并根据实际情况决定是否采纳。如有疑问，欢迎讨论！\n\n`;
      
      if (summary.severityBreakdown.high > 0) {
        summaryText += `⚠️ **重要提醒**: 发现 ${summary.severityBreakdown.high} 个高严重程度问题，建议优先处理。\n`;
      }
    }

    return summaryText;
  }

  /**
   * 获取平台特定的评论格式
   * @param {string} platform - 平台类型
   * @param {Object} review - 审查意见
   * @returns {Object} 格式化的评论
   */
  getPlatformCommentFormat(platform, review) {
    const baseComment = {
      body: `🤖 AI代码审查建议：\n\n${review.review}`,
      line: review.lineNumber,
      path: review.filePath
    };

    // 根据平台调整格式
    switch (platform) {
      case 'gitlab':
        return {
          ...baseComment,
          position: {
            new_line: review.lineNumber,
            new_path: review.filePath
          }
        };
      
      case 'github':
        return {
          ...baseComment,
          line: review.lineNumber,
          path: review.filePath
        };
      
      default:
        return baseComment;
    }
  }

  /**
   * 批量添加评论
   * @param {string} platform - 平台类型
   * @param {Object} reviewResult - 审查结果
   * @param {Function} commentCallback - 评论回调函数
   * @returns {Promise<Object>} 评论添加结果
   */
  async addComments(platform, reviewResult, commentCallback) {
    try {
      const result = {
        platform,
        totalComments: 0,
        addedComments: 0,
        failedComments: 0,
        errors: []
      };

      for (const fileReview of reviewResult.fileReviews) {
        const { filePath, reviews } = fileReview;

        for (const review of reviews) {
          try {
            const comment = this.getPlatformCommentFormat(platform, review);
            
            // 调用平台特定的评论添加函数
            await commentCallback(comment);
            
            result.addedComments++;
            result.totalComments++;

            // 避免API速率限制
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            result.failedComments++;
            result.errors.push({
              filePath,
              lineNumber: review.lineNumber,
              error: error.message
            });

            Logger.error('添加评论失败', error, {
              platform,
              filePath,
              lineNumber: review.lineNumber
            });
          }
        }
      }

      Logger.info('批量添加评论完成', {
        platform,
        totalComments: result.totalComments,
        addedComments: result.addedComments,
        failedComments: result.failedComments
      });

      return result;

    } catch (error) {
      Logger.error('批量添加评论失败', error, { platform });
      throw error;
    }
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态信息
   */
  getServiceStatus() {
    return {
      status: 'running',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      platforms: this.getSupportedPlatforms(),
      currentModel: this.getCurrentModel(),
      supportedModels: this.getSupportedModels(),
      features: [
        'multi-platform-support',
        'multi-model-ai',
        'unified-code-review',
        'intelligent-analysis',
        'performance-optimization'
      ]
    };
  }
}

module.exports = UnifiedCodeReviewer;
