const Logger = require("../utils/logger");
const AI_REVIEW_CONFIG = require("./config/aiReviewConfig");
const FileFilter = require("./utils/fileFilter");
const CodeProcessor = require("./utils/codeProcessor");
const CommentMatcher = require("./utils/commentMatcher");
const CacheManager = require("./utils/cacheManager");
const AIApiService = require("./aiApiService");

/**
 * @typedef {Object} CodeChange
 * @property {string} diff - 代码变更内容
 * @property {string} [new_path] - 新文件路径
 * @property {string} [old_path] - 旧文件路径
 */

/**
 * @typedef {Object} ExistingComment
 * @property {string} filePath - 文件路径
 * @property {string} note - 评论内容
 * @property {number} [line] - 行号
 * @property {number} [startLine] - 开始行号
 * @property {number} [endLine] - 结束行号
 */

/**
 * @typedef {Object} ReviewResult
 * @property {number} lineNumber - 行号
 * @property {string} content - 代码内容
 * @property {string} review - 审查意见
 * @property {number} groupId - 组ID
 * @property {boolean} isGroupEnd - 是否为组结束
 * @property {number} groupSize - 组大小
 */

/**
 * @typedef {Object} FileReviewResult
 * @property {string} filePath - 文件路径
 * @property {ReviewResult[]} review - 审查结果数组
 * @property {CodeChange} change - 变更对象
 */

/**
 * AI 代码审查服务类 - 重构优化版本
 * 负责协调各个模块完成代码审查任务
 */
class AICodeReviewer {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.apiURL = process.env.AI_API_URL;
    
    // 初始化各个服务模块
    this.aiApiService = new AIApiService(this.apiKey, this.apiURL);
    this.cacheManager = new CacheManager();
  }

  /**
   * 生成代码审查 - 重构优化版本
   * @param {CodeChange[]} changes - 代码变更数组
   * @param {ExistingComment[]} existingComments - 已有的评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<FileReviewResult[]>} 每个文件的审查内容数组
   */
  async generateCodeReview(changes, existingComments = [], options = {}) {
    const startTime = Logger.startTimer("AI代码审查");

    try {
      Logger.info("开始生成智能代码审查", {
        fileCount: changes.length,
        existingCommentsCount: existingComments.length,
      });

      // 预处理：过滤需要审查的变更
      const significantChanges = changes.filter((change) =>
        FileFilter.isSignificantChange(
          change.diff,
          change.new_path || change.old_path
        )
      );

      if (significantChanges.length === 0) {
        Logger.info("没有需要审查的重要变更");
        return [];
      }

      // 并行处理文件，但限制并发数
      const fileReviews = await this.processFilesConcurrently(
        significantChanges,
        existingComments,
        options
      );

      Logger.endTimer("AI代码审查", startTime, {
        totalFiles: changes.length,
        reviewedFiles: fileReviews.length,
      });

      return fileReviews;
    } catch (err) {
      Logger.error("AI代码审查失败", err);
      throw err;
    }
  }

  /**
   * 并发处理多个文件
   * @param {CodeChange[]} changes - 重要变更数组
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<FileReviewResult[]>} 文件审查结果数组
   */
  async processFilesConcurrently(changes, existingComments, options = {}) {
    const fileReviews = [];
    const chunks = CodeProcessor.chunkArray(changes, AI_REVIEW_CONFIG.performance.maxConcurrentFiles);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map((change) =>
        this.processSingleFile(change, existingComments, options)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);

      for (const result of chunkResults) {
        if (result.status === "fulfilled" && result.value) {
          fileReviews.push(result.value);
        }
      }
    }

    return fileReviews;
  }

  /**
   * 处理单个文件
   * @param {CodeChange} change - 变更对象
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<FileReviewResult|null>} 文件审查结果
   */
  async processSingleFile(change, existingComments, options = {}) {
    try {
      const fileName = change.new_path || change.old_path;
      const fileDiff = change.diff;

      const fileReview = await this.generateFileReview(
        fileName,
        fileDiff,
        existingComments,
        change,
        options
      );
      const meaningfulReviews = CodeProcessor.filterMeaningfulReviews(fileReview);

      if (meaningfulReviews.length > 0) {
        Logger.info("文件审查完成", {
          fileName,
          reviewCount: meaningfulReviews.length,
        });

        return {
          filePath: fileName,
          review: meaningfulReviews,
          change: change,
        };
      }

      return null;
    } catch (err) {
      Logger.error("文件审查失败", err, { fileName: change.new_path });
      return null;
    }
  }

  /**
   * 为单个文件生成针对性审查 - 重构优化版本
   * @param {string} fileName - 文件名
   * @param {string} diff - 文件变更内容
   * @param {ExistingComment[]} existingComments - 已有的评论数组
   * @param {Object} change - 变更对象（用于检测新文件）
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<ReviewResult[]>} 每行的审查意见数组
   */
  async generateFileReview(fileName, diff, existingComments = [], change = null, options = {}) {
    try {
      const changeLines = CodeProcessor.parseDiffLines(diff);

      if (changeLines.length === 0) {
        return [];
      }

      // 检测是否为新文件
      const isNewFile = this.isNewFile(change);
      
      if (isNewFile) {
        Logger.info(`🆕 检测到新文件 ${fileName}，跳过分组直接审查全部内容`);
        return await this.reviewNewFile(fileName, changeLines, existingComments, options);
      }

      // 智能预过滤：快速过滤明显不需要审查的代码
      const filteredLines = CodeProcessor.preFilterCodeLines(changeLines);

      if (filteredLines.length === 0) {
        Logger.info(`文件 ${fileName} 所有变更都通过预过滤，跳过AI审查`);
        return [];
      }

      // 智能分组：优化分组策略
      const lineGroups = CodeProcessor.optimizeLineGroups(filteredLines);

      if (lineGroups.length === 0) {
        return [];
      }

      // 并行批量处理：多个代码组同时处理
      const batchReviews = await this.processGroupsInParallel(
        fileName,
        lineGroups,
        existingComments,
        options
      );

      return batchReviews;
    } catch (err) {
      Logger.error(`文件 ${fileName} 审查失败`, err);
      return [];
    }
  }

  /**
   * 检测是否为新文件
   * @param {Object} change - 变更对象
   * @returns {boolean} 是否为新文件
   */
  isNewFile(change) {
    if (!change) return false;
    
    // 新文件的条件：
    // 1. old_path 为 null 或 undefined
    // 2. 或者 old_path 不存在
    // 3. 或者 diff 中只有新增行（没有删除行）
    return !change.old_path || 
           change.old_path === null || 
           change.old_path === undefined ||
           this.isOnlyAddedLines(change.diff);
  }

  /**
   * 检查diff是否只包含新增行
   * @param {string} diff - diff内容
   * @returns {boolean} 是否只包含新增行
   */
  isOnlyAddedLines(diff) {
    const lines = diff.split('\n');
    let hasAddedLines = false;
    let hasRemovedLines = false;
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        hasAddedLines = true;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        hasRemovedLines = true;
        break; // 一旦发现删除行，就不是新文件
      }
    }
    
    // 只有新增行且没有删除行，且至少有一行新增内容
    return hasAddedLines && !hasRemovedLines;
  }

  /**
   * 审查新文件 - 直接审查全部内容
   * @param {string} fileName - 文件名
   * @param {Array} changeLines - 变更行数组
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<ReviewResult[]>} 审查结果数组
   */
  async reviewNewFile(fileName, changeLines, existingComments, options = {}) {
    try {
      // 为新文件创建单个大组，包含所有行
      const newFileGroup = {
        id: 1,
        lines: changeLines,
        startLine: changeLines[0]?.lineNumber || 1,
        endLine: changeLines[changeLines.length - 1]?.lineNumber || 1,
        type: "added",
      };

      // 直接调用AI审查整个文件
      const review = await this.aiApiService.generateGroupReview(
        fileName,
        newFileGroup,
        existingComments,
        options
      );

      if (review && review.trim() !== "") {
        const lastLine = changeLines[changeLines.length - 1];
        return [{
          lineNumber: lastLine.lineNumber,
          content: lastLine.content,
          review: review.trim(),
          groupId: newFileGroup.id,
          isGroupEnd: true,
          groupSize: changeLines.length,
        }];
      }

      return [];
    } catch (err) {
      Logger.error(`新文件 ${fileName} 审查失败`, err);
      return [];
    }
  }

  /**
   * 并行处理代码组
   * @param {string} fileName - 文件名
   * @param {Array} lineGroups - 代码组数组
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @returns {Promise<ReviewResult[]>} 审查结果数组
   */
  async processGroupsInParallel(fileName, lineGroups, existingComments, options = {}) {
    const allReviews = [];
    const batches = CodeProcessor.chunkArray(lineGroups, AI_REVIEW_CONFIG.performance.maxGroupsPerBatch);

    // 并行处理多个批次
    const batchPromises = batches.map((batch) =>
      this.processBatchWithFallback(fileName, batch, existingComments, options)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        allReviews.push(...result.value);
      }
    }

    return allReviews;
  }

  /**
   * 处理批次，带降级机制
   * @param {string} fileName - 文件名
   * @param {Array} batch - 代码组批次
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<ReviewResult[]>} 审查结果数组
   */
  async processBatchWithFallback(fileName, batch, existingComments, options = {}) {
    try {
      // 检查缓存
      const cacheKey = this.cacheManager.generateCacheKey(fileName, batch);
      const cachedResult = this.cacheManager.getCachedReview(cacheKey);

      if (cachedResult) {
        return cachedResult;
      }

      // 并行处理批次中的代码组
      const reviews = await this.processBatchParallel(
        fileName,
        batch,
        existingComments,
        options
      );

      if (reviews && reviews.length > 0) {
        // 缓存结果
        this.cacheManager.cacheReview(cacheKey, reviews);
      }

      return reviews;
    } catch (err) {
      Logger.error("批次处理失败，降级为单个处理", err, {
        fileName,
        batchSize: batch.length,
      });
      // 降级为单个处理
      return this.processGroupsIndividually(fileName, batch, existingComments);
    }
  }

  /**
   * 并行处理批次中的代码组
   * @param {string} fileName - 文件名
   * @param {Array} batch - 代码组批次
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @returns {Promise<ReviewResult[]>} 审查结果数组
   */
  async processBatchParallel(fileName, batch, existingComments, options = {}) {
    // 过滤掉已有评论的组
    const filteredGroups = batch.filter(
      (group) =>
        !CommentMatcher.hasSimilarComment(
          existingComments,
          fileName,
          group.startLine,
          group.endLine,
          group.lines
        )
    );

    if (filteredGroups.length === 0) {
      return [];
    }

    // 如果组数较少，使用批量处理
    if (filteredGroups.length <= 3) {
      return this.aiApiService.generateBatchReview(
        fileName,
        filteredGroups,
        existingComments,
        options
      );
    }

    // 如果组数较多，并行处理多个小批次
    const subBatches = CodeProcessor.chunkArray(
      filteredGroups,
      Math.ceil(filteredGroups.length / 2)
    );
    const subBatchPromises = subBatches.map((subBatch) =>
      this.aiApiService.generateBatchReview(fileName, subBatch, existingComments, options)
    );

    const subBatchResults = await Promise.allSettled(subBatchPromises);
    const allReviews = [];

    for (const result of subBatchResults) {
      if (result.status === "fulfilled" && result.value) {
        allReviews.push(...result.value);
      }
    }

    return allReviews;
  }

  /**
   * 降级处理：单个处理代码组
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {ExistingComment[]} existingComments - 已有评论数组
   * @returns {Promise<ReviewResult[]>} 审查结果数组
   */
  async processGroupsIndividually(fileName, groups, existingComments) {
    const reviews = [];

    for (const group of groups) {
      try {
        const review = await this.aiApiService.generateGroupReview(
          fileName,
          group,
          existingComments
        );
        if (review && review.trim() !== "") {
          const lastLine = group.lines[group.lines.length - 1];
          reviews.push({
            lineNumber: lastLine.lineNumber,
            content: lastLine.content,
            review,
            groupId: group.id,
            isGroupEnd: true,
            groupSize: group.lines.length,
          });
        }
      } catch (err) {
        Logger.error("单个组审查失败", err, { fileName, groupId: group.id });
      }
    }

    return reviews;
  }
}

module.exports = AICodeReviewer;