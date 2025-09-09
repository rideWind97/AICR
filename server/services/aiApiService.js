/**
 * AI API服务类
 */
const axios = require("axios");
const Logger = require("../utils/logger");
const AI_REVIEW_CONFIG = require("./config/aiReviewConfig");
const PromptGenerator = require("./utils/promptGenerator");

class AIApiService {
  constructor(apiKey, apiURL) {
    this.apiKey = apiKey;
    this.apiURL = apiURL;
  }

  /**
   * 批量生成审查意见
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {Array} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<Array>} 审查结果数组
   */
  async generateBatchReview(fileName, groups, existingComments, options = {}) {
    try {
      const reviewText = await this.callAIForReview(fileName, groups, options);
      const results = this.parseBatchReviewResultFast(fileName, groups, reviewText);

      Logger.info(`📊 批量审查解析结果 [${fileName}]:`, {
        totalGroups: groups.length,
        generatedReviews: results.length,
        results: results.map((r) => ({
          lineNumber: r.lineNumber,
          reviewPreview: r.review.substring(0, 100) + "...",
        })),
      });

      return results;
    } catch (err) {
      Logger.error("批量审查失败", err);
      return [];
    }
  }

  /**
   * 为代码组生成审查意见
   * @param {string} fileName - 文件名
   * @param {Object} group - 代码组信息
   * @param {Array} existingComments - 已有评论数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<string>} 针对该组的审查意见
   */
  async generateGroupReview(fileName, group, existingComments = [], options = {}) {
    try {
      // 将单个组转换为数组格式，使用统一的批量处理逻辑
      const groups = [group];
      const reviewText = await this.callAIForReview(fileName, groups, options);

      if (reviewText === "PASS" || reviewText.includes("PASS") || reviewText.length < 10) {
        return null;
      }

      return reviewText;
    } catch (err) {
      Logger.error("代码组审查失败", err);
      return null;
    }
  }

  /**
   * 调用AI进行代码审查（私有方法）
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID
   * @param {string} options.ref - 分支或commit SHA
   * @param {Object} options.gitlabAPI - GitLab API实例
   * @returns {Promise<string>} AI返回的审查文本
   * @private
   */
  async callAIForReview(fileName, groups, options = {}) {
    // 尝试获取项目自定义prompt
    let prompt;
    if (options.projectId && options.gitlabAPI) {
      const projectPrompt = await PromptGenerator.getProjectPromptAsync(
        options.projectId, 
        options.ref, 
        options.gitlabAPI
      );
      
      if (projectPrompt) {
        // 使用项目自定义prompt
        prompt = `🔍 AI代码审查 - 文件: ${fileName}\n\n`;
        groups.forEach((group, index) => {
          const codeContent = group.lines.map((line) => line.content).join("\n");
          prompt += `${index + 1}. 行${group.startLine}-${group.endLine}:\n${codeContent}\n\n`;
        });
        prompt += projectPrompt;
      } else {
        // 使用默认prompt
        prompt = PromptGenerator.createOptimizedPrompt(fileName, groups, options);
      }
    } else {
      // 使用默认prompt
      prompt = PromptGenerator.createOptimizedPrompt(fileName, groups, options);
    }

    const response = await axios.post(
      `${this.apiURL}/chat/completions`,
      {
        model: AI_REVIEW_CONFIG.api.model,
        messages: [
          {
            role: "system",
            content:
              "你是代码审查专家。分析代码组，只为有问题的组提供具体的改进建议。如果代码完全没有问题，请直接回复'PASS'，不要生成任何评论。用中文，简洁。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: Math.min(AI_REVIEW_CONFIG.api.maxTokens, 600),
        temperature: AI_REVIEW_CONFIG.api.temperature,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: AI_REVIEW_CONFIG.api.requestTimeout,
      }
    );

    return response.data.choices[0].message.content.trim();
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
      // 检查是否所有组都通过审查
      const lines = reviewText.split('\n').filter(line => line.trim());
      const allPass = lines.every(line => line.includes('PASS'));
      
      if (allPass) {
        return reviews;
      }

      if (
        reviewText.trim() &&
        reviewText.length > 10
      ) {
        // 解析带编号的响应 - 确保处理所有组
        lines.forEach((line, index) => {
          if (line.includes('PASS')) {
            return; // 跳过PASS的组
          }
          
          const group = groups[index];
          if (group) {
            const lastLine = group.lines[group.lines.length - 1];
            
            // 清理响应文本，移除编号
            const cleanReview = line.replace(/^\d+\.\s*/, '').trim();
            
            if (cleanReview && cleanReview !== 'PASS') {
              reviews.push({
                lineNumber: lastLine.lineNumber,
                content: lastLine.content,
                review: cleanReview,
                groupId: group.id,
                isGroupEnd: true,
                groupSize: group.lines.length,
              });
            }
          }
        });
        
        // 如果没有解析到任何结果，尝试其他解析方式
        if (reviews.length === 0) {
          // 尝试按组数量分割响应
          const groupCount = groups.length;
          const responseLines = reviewText.split('\n').filter(line => line.trim());
          
          if (responseLines.length >= groupCount) {
            // 如果响应行数大于等于组数，按组分配
            responseLines.slice(0, groupCount).forEach((line, index) => {
              const group = groups[index];
              if (group && !line.includes('PASS')) {
                const lastLine = group.lines[group.lines.length - 1];
                const cleanReview = line.replace(/^\d+\.\s*/, '').trim();
                
                if (cleanReview && cleanReview !== 'PASS') {
                  reviews.push({
                    lineNumber: lastLine.lineNumber,
                    content: lastLine.content,
                    review: cleanReview,
                    groupId: group.id,
                    isGroupEnd: true,
                    groupSize: group.lines.length,
                  });
                }
              }
            });
          } else {
            // 如果响应行数少于组数，将响应分配给第一个组
            const firstGroup = groups[0];
            if (firstGroup) {
              const lastLine = firstGroup.lines[firstGroup.lines.length - 1];
              reviews.push({
                lineNumber: lastLine.lineNumber,
                content: lastLine.content,
                review: reviewText.trim(),
                groupId: firstGroup.id,
                isGroupEnd: true,
                groupSize: firstGroup.lines.length,
              });
            }
          }
        }
      }
    } catch (err) {
      Logger.error("快速解析批量审查结果失败", err);
    }

    return reviews;
  }

  /**
   * 判断审查意见是否质量较低
   * @param {string} review - 审查意见
   * @returns {boolean} 是否质量较低
   */
  isLowQualityReview(review) {
    return AI_REVIEW_CONFIG.lowQualityPatterns.some((pattern) =>
      review.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}

module.exports = AIApiService;
