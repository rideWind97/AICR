const { getAIProvider, getSupportedModels, isModelSupported } = require('./aiProviders');
const Logger = require('../utils/logger');

/**
 * 多模型AI代码审查服务
 * 支持OpenAI、Claude、DeepSeek、Qwen、Gemini等多种AI模型
 */
class MultiModelAICodeReviewer {
  constructor() {
    this.currentModel = process.env.AI_MODEL || 'deepseek-coder';
    this.aiProvider = null;
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.3;
    
    // 性能优化配置
    this.maxConcurrentFiles = parseInt(process.env.MAX_FILES_CONCURRENT) || 5;
    this.maxGroupsPerBatch = parseInt(process.env.MAX_GROUPS_PER_BATCH) || 15;
    this.maxLinesPerGroup = parseInt(process.env.MAX_LINES_PER_GROUP) || 40;
    this.requestTimeout = parseInt(process.env.AI_REQUEST_TIMEOUT) || 6000;
    this.maxConcurrentAI = parseInt(process.env.MAX_CONCURRENT_AI) || 3;
    
    // 缓存机制
    this.reviewCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24小时过期
    
    // 初始化AI提供者
    this.initializeAIProvider();
  }

  /**
   * 初始化AI提供者
   */
  initializeAIProvider() {
    try {
      const config = this.getModelConfig(this.currentModel);
      this.aiProvider = getAIProvider(this.currentModel, config);
      
      Logger.info('AI提供者初始化成功', {
        model: this.currentModel,
        provider: this.aiProvider.constructor.name
      });
    } catch (error) {
      Logger.error('AI提供者初始化失败', error);
      throw error;
    }
  }

  /**
   * 获取模型配置
   * @param {string} model - 模型名称
   * @returns {Object} 模型配置
   */
  getModelConfig(model) {
    const baseConfig = {
      model: model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      timeout: this.requestTimeout
    };

    // 根据模型类型设置不同的配置
    if (model.startsWith('gpt-')) {
      return {
        ...baseConfig,
        apiKey: process.env.OPENAI_API_KEY,
        apiURL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1'
      };
    } else if (model.startsWith('claude-')) {
      return {
        ...baseConfig,
        apiKey: process.env.CLAUDE_API_KEY,
        apiURL: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1'
      };
    } else if (model.startsWith('deepseek-')) {
      return {
        ...baseConfig,
        apiKey: process.env.DEEPSEEK_API_KEY,
        apiURL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'
      };
    } else if (model.startsWith('qwen-')) {
      return {
        ...baseConfig,
        apiKey: process.env.QWEN_API_KEY,
        apiURL: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1'
      };
    } else if (model.startsWith('gemini-')) {
      return {
        ...baseConfig,
        apiKey: process.env.GEMINI_API_KEY,
        apiURL: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta'
      };
    } else {
      throw new Error(`不支持的模型: ${model}`);
    }
  }

  /**
   * 切换AI模型
   * @param {string} model - 新模型名称
   */
  switchModel(model) {
    if (!isModelSupported(model)) {
      throw new Error(`不支持的模型: ${model}`);
    }

    this.currentModel = model;
    this.initializeAIProvider();
    
    Logger.info('AI模型切换成功', { newModel: model });
  }

  /**
   * 获取支持的模型列表
   * @returns {Array} 支持的模型列表
   */
  getSupportedModels() {
    return getSupportedModels();
  }

  /**
   * 生成代码审查 - 多模型版本
   * @param {Array} changes - 代码变更数组
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<Array>} 每个文件的审查内容数组
   */
  async generateCodeReview(changes, existingComments = []) {
    const startTime = Logger.startTimer('多模型AI代码审查');
    
    try {
      Logger.info('开始生成智能代码审查', { 
        model: this.currentModel,
        fileCount: changes.length,
        existingCommentsCount: existingComments.length 
      });
      
      // 预处理：过滤需要审查的变更
      const significantChanges = changes.filter(change => 
        this.isSignificantChange(change.diff)
      );
      
      if (significantChanges.length === 0) {
        Logger.info('没有需要审查的重要变更');
        return [];
      }
      
      // 并行处理文件，但限制并发数
      const fileReviews = await this.processFilesConcurrently(
        significantChanges, 
        existingComments
      );
      
      Logger.endTimer('多模型AI代码审查', startTime, { 
        model: this.currentModel,
        totalFiles: changes.length,
        reviewedFiles: fileReviews.length 
      });
      
      return fileReviews;
      
    } catch (err) {
      Logger.error('多模型AI代码审查失败', err);
      throw err;
    }
  }

  /**
   * 并发处理多个文件
   * @param {Array} changes - 重要变更数组
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 文件审查结果数组
   */
  async processFilesConcurrently(changes, existingComments) {
    const fileReviews = [];
    const chunks = this.chunkArray(changes, this.maxConcurrentFiles);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(change => 
        this.processSingleFile(change, existingComments)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      for (const result of chunkResults) {
        if (result.status === 'fulfilled' && result.value) {
          fileReviews.push(result.value);
        }
      }
    }
    
    return fileReviews;
  }

  /**
   * 处理单个文件
   * @param {Object} change - 变更对象
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Object|null>} 文件审查结果
   */
  async processSingleFile(change, existingComments) {
    try {
      const fileName = change.new_path || change.old_path;
      const fileDiff = change.diff;
      
      const fileReview = await this.generateFileReview(fileName, fileDiff, existingComments);
      const meaningfulReviews = this.filterMeaningfulReviews(fileReview);
      
      if (meaningfulReviews.length > 0) {
        Logger.info('文件审查完成', {
          fileName,
          model: this.currentModel,
          reviewCount: meaningfulReviews.length
        });
        
        return {
          filePath: fileName,
          review: meaningfulReviews,
          change: change,
          model: this.currentModel
        };
      }
      
      return null;
    } catch (err) {
      Logger.error('文件审查失败', err, { fileName: change.new_path });
      return null;
    }
  }

  /**
   * 为单个文件生成针对性审查
   * @param {string} fileName - 文件名
   * @param {string} diff - 文件变更内容
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<Array>} 每行的审查意见数组
   */
  async generateFileReview(fileName, diff, existingComments = []) {
    try {
      const changeLines = this.parseDiffLines(diff);
      
      if (changeLines.length === 0) {
        return [];
      }
      
      // 智能预过滤：快速过滤明显不需要审查的代码
      const filteredLines = this.preFilterCodeLines(changeLines);
      
      if (filteredLines.length === 0) {
        Logger.info(`文件 ${fileName} 所有变更都通过预过滤，跳过AI审查`);
        return [];
      }
      
      // 智能分组：优化分组策略
      const lineGroups = this.optimizeLineGroups(filteredLines);
      
      if (lineGroups.length === 0) {
        return [];
      }
      
      // 并行批量处理：多个代码组同时处理
      const batchReviews = await this.processGroupsInParallel(
        fileName, 
        lineGroups, 
        existingComments
      );
      
      return batchReviews;
      
    } catch (err) {
      Logger.error(`文件 ${fileName} 审查失败`, err);
      return [];
    }
  }

  /**
   * 智能预过滤代码行
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 过滤后的变更行数组
   */
  preFilterCodeLines(changeLines) {
    return changeLines.filter(line => {
      const content = line.content.trim();
      
      // 快速长度检查
      if (content.length < 3) {
        return false;
      }
      
      if (content.length > 200) {
        return true; // 长代码行需要审查
      }
      
      // 跳过明显不需要审查的代码
      const skipPatterns = [
        /^\s*\/\/\s*TODO:/i,
        /^\s*\/\/\s*FIXME:/i,
        /^\s*\/\/\s*NOTE:/i,
        /^\s*\/\*.*\*\/\s*$/,
        /^\s*console\.log\s*\(/i,
        /^\s*console\.warn\s*\(/i,
        /^\s*console\.error\s*\(/i,
        /^\s*debugger\s*;?\s*$/,
        /^\s*import\s+.*\s+from\s+['"]/,
        /^\s*export\s+/,
        /^\s*}\s*$/,
        /^\s*{\s*$/,
        /^\s*\)\s*$/,
        /^\s*\(\s*$/,
        /^\s*;\s*$/,
        /^\s*,\s*$/,
        /^\s*\[\s*\]\s*$/,
        /^\s*{\s*}\s*$/
      ];
      
      for (const pattern of skipPatterns) {
        if (pattern.test(content)) {
          return false;
        }
      }
      
      // 检查是否只是空白字符
      if (/^\s*$/.test(content)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 优化代码行分组策略
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 优化后的分组数组
   */
  optimizeLineGroups(changeLines) {
    if (changeLines.length === 0) return [];
    
    const groups = [];
    let currentGroup = {
      id: 1,
      lines: [changeLines[0]],
      startLine: changeLines[0].lineNumber,
      endLine: changeLines[0].lineNumber,
      type: 'added'
    };
    
    for (let i = 1; i < changeLines.length; i++) {
      const currentLine = changeLines[i];
      const lastLine = currentGroup.lines[currentGroup.lines.length - 1];
      
      // 优化分组策略：限制每组的最大行数
      const shouldStartNewGroup = 
        currentLine.lineNumber !== lastLine.lineNumber + 1 || 
        currentGroup.lines.length >= this.maxLinesPerGroup;
      
      if (shouldStartNewGroup) {
        groups.push(currentGroup);
        currentGroup = {
          id: groups.length + 1,
          lines: [currentLine],
          startLine: currentLine.lineNumber,
          endLine: currentLine.lineNumber,
          type: 'added'
        };
      } else {
        currentGroup.lines.push(currentLine);
        currentGroup.endLine = currentLine.lineNumber;
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  /**
   * 并行处理代码组
   * @param {string} fileName - 文件名
   * @param {Array} lineGroups - 代码组数组
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 审查结果数组
   */
  async processGroupsInParallel(fileName, lineGroups, existingComments) {
    const allReviews = [];
    const batches = this.chunkArray(lineGroups, this.maxGroupsPerBatch);
    
    // 并行处理多个批次
    const batchPromises = batches.map(batch => 
      this.processBatchWithFallback(fileName, batch, existingComments)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        allReviews.push(...result.value);
      }
    }
    
    return allReviews;
  }

  /**
   * 处理批次，带降级机制
   * @param {string} fileName - 文件名
   * @param {Array} batch - 代码组批次
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 审查结果数组
   */
  async processBatchWithFallback(fileName, batch, existingComments) {
    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(fileName, batch);
      const cachedResult = this.getCachedReview(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      // 并行处理批次中的代码组
      const reviews = await this.processBatchParallel(fileName, batch, existingComments);
      
      if (reviews && reviews.length > 0) {
        // 缓存结果
        this.cacheReview(cacheKey, reviews);
      }
      
      return reviews;
      
    } catch (err) {
      Logger.error('批次处理失败，降级为单个处理', err, { fileName, batchSize: batch.length });
      // 降级为单个处理
      return this.processGroupsIndividually(fileName, batch, existingComments);
    }
  }

  /**
   * 并行处理批次中的代码组
   * @param {string} fileName - 文件名
   * @param {Array} batch - 代码组批次
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 审查结果数组
   */
  async processBatchParallel(fileName, batch, existingComments) {
    // 过滤掉已有评论的组
    const filteredGroups = batch.filter(group => 
      !this.hasSimilarComment(existingComments, fileName, group.startLine, group.endLine, group.lines)
    );
    
    if (filteredGroups.length === 0) {
      return [];
    }
    
    // 如果组数较少，使用批量处理
    if (filteredGroups.length <= 3) {
      return this.generateBatchReview(fileName, filteredGroups, existingComments);
    }
    
    // 如果组数较多，并行处理多个小批次
    const subBatches = this.chunkArray(filteredGroups, Math.ceil(filteredGroups.length / 2));
    const subBatchPromises = subBatches.map(subBatch => 
      this.generateBatchReview(fileName, subBatch, existingComments)
    );
    
    const subBatchResults = await Promise.allSettled(subBatchPromises);
    const allReviews = [];
    
    for (const result of subBatchResults) {
      if (result.status === 'fulfilled' && result.value) {
        allReviews.push(...result.value);
      }
    }
    
    return allReviews;
  }

  /**
   * 批量生成审查意见 - 多模型版本
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 审查结果数组
   */
  async generateBatchReview(fileName, groups, existingComments) {
    try {
      // 构建优化的提示词
      const prompt = this.createOptimizedPrompt(fileName, groups);

      // 调用 AI API
      const messages = [
        {
          role: "system",
          content: "你是代码审查专家。分析代码组，为有问题的组提供改进建议，无问题的回复PASS。用中文，简洁。",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.aiProvider.generateReview(messages);
      const reviewText = response.content.trim();
      
      // 快速解析批量审查结果
      return this.parseBatchReviewResultFast(fileName, groups, reviewText);
      
    } catch (err) {
      Logger.error('批量审查失败', err);
      return [];
    }
  }

  /**
   * 创建优化的提示词
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @returns {string} 优化的提示词
   */
  createOptimizedPrompt(fileName, groups) {
    let prompt = `审查文件: ${fileName}\n\n`;
    
    groups.forEach((group, index) => {
      const codeContent = group.lines.map(line => line.content).join('\n');
      prompt += `${index + 1}. 行${group.startLine}-${group.endLine}:\n${codeContent}\n\n`;
    });
    
    prompt += `回复格式：\n1. [意见或PASS]\n2. [意见或PASS]\n...\n\n要求：中文，每意见<80字，无问题回复PASS`;
    
    return prompt;
  }

  /**
   * 快速解析批量审查结果
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {string} reviewText - AI 返回的审查文本
   * @returns {Array} 解析后的审查结果
   */
  parseBatchReviewResultFast(fileName, groups, reviewText) {
    const reviews = [];
    
    try {
      // 使用正则表达式快速解析
      const lines = reviewText.split('\n');
      const reviewPattern = /^(\d+)\.\s*(.+)$/;
      
      for (let i = 0; i < groups.length && i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(reviewPattern);
        
        if (match) {
          const groupIndex = parseInt(match[1]) - 1;
          const reviewContent = match[2].trim();
          
          if (groupIndex >= 0 && groupIndex < groups.length && 
              reviewContent && !reviewContent.includes('PASS') && 
              reviewContent.length > 10) {
            
            const group = groups[groupIndex];
            const lastLine = group.lines[group.lines.length - 1];
            
            reviews.push({
              lineNumber: lastLine.lineNumber,
              content: lastLine.content,
              review: reviewContent,
              groupId: group.id,
              isGroupEnd: true,
              groupSize: group.lines.length
            });
          }
        }
      }
    } catch (err) {
      Logger.error('快速解析批量审查结果失败', err);
    }
    
    return reviews;
  }

  /**
   * 降级处理：单个处理代码组
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {Array} existingComments - 已有评论数组
   * @returns {Promise<Array>} 审查结果数组
   */
  async processGroupsIndividually(fileName, groups, existingComments) {
    const reviews = [];
    
    for (const group of groups) {
      try {
        const review = await this.generateGroupReview(fileName, group, existingComments);
        if (review && review.trim() !== '') {
          const lastLine = group.lines[group.lines.length - 1];
          reviews.push({
            lineNumber: lastLine.lineNumber,
            content: lastLine.content,
            review: review,
            groupId: group.id,
            isGroupEnd: true,
            groupSize: group.lines.length
          });
        }
      } catch (err) {
        Logger.error('单个组审查失败', err, { fileName, groupId: group.id });
      }
    }
    
    return reviews;
  }

  /**
   * 为代码组生成审查意见
   * @param {string} fileName - 文件名
   * @param {Object} group - 代码组信息
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<string>} 针对该组的审查意见
   */
  async generateGroupReview(fileName, group, existingComments = []) {
    try {
      const { lines, startLine, endLine } = group;
      
      // 检查是否已有相关评论
      if (this.hasSimilarComment(existingComments, fileName, startLine, endLine, lines)) {
        return null;
      }
      
      // 构建针对性的提示，分析整个代码组
      const prompt = this.createGroupReviewPrompt(fileName, lines, startLine, endLine);

      // 调用 AI 生成针对该组的审查意见
      const messages = [
        {
          role: "system",
          content: "你是一个专业的代码审查专家。请仔细分析代码，如果发现任何问题或改进点，请提供具体的建议。如果代码完全没有问题，请直接回复'PASS'（不要解释为什么没问题）。",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      const response = await this.aiProvider.generateReview(messages);
      const review = response.content.trim();
      
      // 如果 AI 认为没有问题，返回 null
      if (review === 'PASS' || review.includes('PASS') || review.length < 10) {
        return null;
      }

      // 如果 AI 返回的内容太长，进行截断
      if (review.length > 200) {
        return review.substring(0, 200) + "...";
      }

      return review;
    } catch (err) {
      Logger.error(`代码组审查失败:`, err.message);
      return null;
    }
  }

  /**
   * 创建组级审查提示
   * @param {string} fileName - 文件名
   * @param {Array} lines - 代码行数组
   * @param {number} startLine - 开始行号
   * @param {number} endLine - 结束行号
   * @returns {string} 提示内容
   */
  createGroupReviewPrompt(fileName, lines, startLine, endLine) {
    const codeContent = lines.map(line => line.content).join('\n');
    const lineCount = lines.length;

    return `
请审查以下新增代码组（这是一个完整的代码变更单元）：

文件: ${fileName}
行号范围: ${startLine}-${endLine} (共${lineCount}行)
变更类型: 新增代码
代码内容:
${codeContent}

请从以下角度分析这一组新增代码：
1. 代码质量：命名规范、语法正确性、逻辑合理性
2. 安全性：潜在的安全风险
3. 性能：性能影响
4. 最佳实践：是否符合编码规范
5. 代码结构：是否合理
6. 整体逻辑：这几行代码作为一个整体是否逻辑清晰

重要提示：
- 这是新增的代码，请重点关注新代码的质量和逻辑
- 不要分析删除的代码，只关注新增的代码
- 分析整个代码段的逻辑，不要单独分析每一行
- 关注代码段之间的关联性和整体设计
- 你的评论将显示在最后一行（第${endLine}行），代表整个代码段的审查意见
- 如果代码完全没有问题，请直接回复"PASS"
- 如果发现问题，请给出具体的改进建议

要求：
- 用中文回复
- 简洁明了，不超过 150 字
- 重点关注新增代码的逻辑和设计
- 不要生成"无问题"、"代码很好"等无意义的评论
`;
  }

  /**
   * 判断变更是否重要，需要审查
   * @param {string} diff - diff 内容
   * @returns {boolean} 是否需要审查
   */
  isSignificantChange(diff) {
    const lines = diff.split('\n');
    let addedLineCount = 0;
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLineCount++;
      }
    }
    
    return addedLineCount > 0;
  }

  /**
   * 过滤有意义的审查意见
   * @param {Array} reviews - 审查意见数组
   * @returns {Array} 过滤后的审查意见
   */
  filterMeaningfulReviews(reviews) {
    if (!reviews || reviews.length === 0) return [];
    
    const meaningfulReviews = [];
    const seenContent = new Set();
    
    for (const review of reviews) {
      if (!review.review || review.review.trim() === '') {
        continue;
      }
      
      const contentKey = `${review.lineNumber}-${review.review.substring(0, 50)}`;
      if (seenContent.has(contentKey)) {
        continue;
      }
      
      if (review.review.length < 15) {
        continue;
      }
      
      if (this.isLowQualityReview(review.review)) {
        continue;
      }
      
      meaningfulReviews.push(review);
      seenContent.add(contentKey);
    }
    
    return meaningfulReviews;
  }

  /**
   * 判断审查意见是否质量较低
   * @param {string} review - 审查意见
   * @returns {boolean} 是否质量较低
   */
  isLowQualityReview(review) {
    const lowQualityPatterns = [
      'PASS', 'pass', 'Pass', '无问题', '没问题', '代码正确',
      '语法正确', '命名规范', '逻辑合理', '没有发现',
      '看起来不错', '代码很好', '没有问题', '代码没问题'
    ];
    
    return lowQualityPatterns.some(pattern => 
      review.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * 解析 diff 内容，提取变更行信息
   * @param {string} diff - diff 内容
   * @returns {Array} 变更行信息数组
   */
  parseDiffLines(diff) {
    const lines = diff.split("\n");
    const changeLines = [];
    let currentLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d*/);
        if (match) {
          currentLineNumber = parseInt(match[2]);
        }
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        const codeContent = line.substring(1);
        changeLines.push({
          type: "added",
          lineNumber: currentLineNumber,
          content: codeContent,
          originalLine: line,
        });
        currentLineNumber++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        continue;
      } else if (!line.startsWith("---") && !line.startsWith("+++")) {
        currentLineNumber++;
      }
    }

    return changeLines;
  }

  /**
   * 检查是否已有相关评论
   * @param {Array} existingComments - 已有评论数组
   * @param {string} fileName - 文件名
   * @param {number} startLine - 开始行号
   * @param {number} endLine - 结束行号
   * @param {Array} lines - 代码行数组
   * @returns {boolean} 是否已有相关评论
   */
  hasSimilarComment(existingComments, fileName, startLine, endLine, lines) {
    if (!existingComments || existingComments.length === 0) {
      return false;
    }

    const fileComments = existingComments.filter(comment => 
      comment.filePath === fileName || comment.filePath === 'general'
    );

    if (fileComments.length === 0) {
      return false;
    }

    for (const comment of fileComments) {
      if (this.isCommentOverlapping(comment, startLine, endLine)) {
        if (this.isCommentSimilar(comment, lines)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查评论是否与当前代码段重叠
   * @param {Object} comment - 评论对象
   * @param {number} startLine - 开始行号
   * @param {number} endLine - 结束行号
   * @returns {boolean} 是否重叠
   */
  isCommentOverlapping(comment, startLine, endLine) {
    if (comment.startLine && comment.endLine) {
      return !(endLine < comment.startLine || startLine > comment.endLine);
    } else if (comment.line) {
      return comment.line >= startLine && comment.line <= endLine;
    }
    
    if (comment.filePath === 'general') {
      return true;
    }
    
    return false;
  }

  /**
   * 检查评论内容是否相似
   * @param {Object} comment - 评论对象
   * @param {Array} lines - 代码行数组
   * @returns {boolean} 是否相似
   */
  isCommentSimilar(comment, lines) {
    if (!comment.note || !comment.note.trim()) {
      return false;
    }

    const commentText = comment.note.toLowerCase();
    const codeContent = lines.map(line => line.content).join(' ').toLowerCase();

    const commonIssues = [
      '注释', 'comment', '无意义', '无用', '删除', 'remove',
      '代码质量', '代码规范', '最佳实践', '代码结构', '无效', '冗余'
    ];

    const hasCommonIssue = commonIssues.some(issue => 
      commentText.includes(issue)
    );

    if (hasCommonIssue) {
      if (this.isCommentRelatedIssue(commentText, codeContent)) {
        return true;
      }

      const codeWords = codeContent.split(/\s+/).filter(word => word.length > 1);
      const commentWords = commentText.split(/\s+/).filter(word => word.length > 1);
      
      const overlapCount = codeWords.filter(word => 
        commentWords.includes(word)
      ).length;

      const similarityRatio = overlapCount / Math.max(codeWords.length, commentWords.length);
      
      return overlapCount > 0 && similarityRatio > 0.05;
    }

    return false;
  }

  /**
   * 检查是否是注释相关问题
   * @param {string} commentText - 评论文本
   * @param {string} codeContent - 代码内容
   * @returns {boolean} 是否是注释相关问题
   */
  isCommentRelatedIssue(commentText, codeContent) {
    const commentKeywords = ['注释', 'comment', '无意义', '无用', '删除', '无效', '冗余'];
    const hasCommentKeywords = commentKeywords.some(keyword => 
      commentText.includes(keyword)
    );

    const hasCommentInCode = codeContent.includes('//') || codeContent.includes('/*') || codeContent.includes('*/');

    if (hasCommentKeywords && hasCommentInCode) {
      const similarSuggestions = [
        '删除', 'remove', '删除', '替换', 'replace', '避免', 'avoid'
      ];
      
      const hasSimilarSuggestion = similarSuggestions.some(suggestion => 
        commentText.includes(suggestion)
      );
      
      return hasSimilarSuggestion;
    }

    return false;
  }

  /**
   * 缓存相关方法
   */
  generateCacheKey(fileName, groups) {
    const groupContent = groups.map(g => 
      `${g.startLine}-${g.endLine}:${g.lines.map(l => l.content).join('')}`
    ).join('|');
    return `${fileName}:${groupContent}`;
  }

  getCachedReview(cacheKey) {
    const cached = this.reviewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.reviews;
    }
    this.reviewCache.delete(cacheKey);
    return null;
  }

  cacheReview(cacheKey, reviews) {
    this.reviewCache.set(cacheKey, {
      reviews,
      timestamp: Date.now()
    });
    
    if (this.reviewCache.size > 1000) {
      this.cleanupCache();
    }
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.reviewCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.reviewCache.delete(key);
      }
    }
  }

  /**
   * 工具方法
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = MultiModelAICodeReviewer;
