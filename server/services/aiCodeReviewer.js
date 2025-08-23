const axios = require('axios');
const { createReviewPrompt } = require('../utils/helpers');
const Logger = require('../utils/logger');

/**
 * AI 代码审查服务类
 */
class AICodeReviewer {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiURL = process.env.DEEPSEEK_API_URL;
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-coder';
    this.maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.DEEPSEEK_TEMPERATURE) || 0.3;
  }

  /**
   * 生成代码审查
   * @param {Array} changes - 代码变更数组
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<Array>} 每个文件的审查内容数组
   */
  async generateCodeReview(changes, existingComments = []) {
    const startTime = Logger.startTimer('AI代码审查');
    
    try {
      Logger.info('开始生成智能代码审查', { 
        fileCount: changes.length,
        existingCommentsCount: existingComments.length 
      });
      
      const fileReviews = [];
      
      // 为每个文件生成针对性的审查
      for (const change of changes) {
        const fileName = change.new_path || change.old_path;

        // 分析该文件的变更内容
        const fileDiff = change.diff;
        
        // 智能过滤：只审查重要的变更
        if (this.isSignificantChange(fileDiff)) {
          const fileReview = await this.generateFileReview(fileName, fileDiff, existingComments);
          
          // 进一步过滤：只保留有意义的审查意见
          const meaningfulReviews = this.filterMeaningfulReviews(fileReview);
          
          if (meaningfulReviews.length > 0) {
            fileReviews.push({
              filePath: fileName,
              review: meaningfulReviews,
              change: change,
            });
            
            Logger.info('文件审查完成', {
              fileName,
              reviewCount: meaningfulReviews.length
            });
          }
        }
      }

      Logger.endTimer('AI代码审查', startTime, { 
        totalFiles: changes.length,
        reviewedFiles: fileReviews.length 
      });
      
      return fileReviews;
      
    } catch (err) {
      Logger.error('AI代码审查失败', err);
      throw err;
    }
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
      // 只统计新增的行
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLineCount++;
      }
    }
    
    // 所有新增代码都需要审查，不再限制行数
    // 即使只有 1 行新增，也可能包含重要的逻辑变更
    
    // 检查是否包含重要的代码结构变更
    const hasStructureChange = diff.includes('function ') || 
                              diff.includes('class ') || 
                              diff.includes('import ') || 
                              diff.includes('export ') ||
                              diff.includes('if (') ||
                              diff.includes('for (') ||
                              diff.includes('while (') ||
                              diff.includes('return ') ||
                              diff.includes('throw ') ||
                              diff.includes('console.') ||
                              diff.includes('debugger') ||
                              diff.includes('TODO') ||
                              diff.includes('FIXME');
    
    // 只要有新增代码就进行审查
    return addedLineCount > 0;
  }

  /**
   * 过滤有意义的审查意见，去除重复和低质量的意见
   * @param {Array} reviews - 审查意见数组
   * @returns {Array} 过滤后的审查意见
   */
  filterMeaningfulReviews(reviews) {
    if (!reviews || reviews.length === 0) return [];
    
    const meaningfulReviews = [];
    const seenContent = new Set();
    
    for (const review of reviews) {
      // 跳过空内容
      if (!review.review || review.review.trim() === '') {
        continue;
      }
      
      // 跳过重复内容（基于行号范围）
      const contentKey = `${review.lineNumber}-${review.review.substring(0, 50)}`;
      if (seenContent.has(contentKey)) {
        continue;
      }
      
      // 跳过过于简单的意见
      if (review.review.length < 15) {
        continue;
      }
      
      // 跳过明显的无意义意见
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
      'PASS',
      'pass',
      'Pass',
      '无问题',
      '没问题',
      '代码正确',
      '语法正确',
      '命名规范',
      '逻辑合理',
      '没有发现',
      '看起来不错',
      '代码很好',
      '没有问题',
      '代码没问题'
    ];
    
    return lowQualityPatterns.some(pattern => 
      review.toLowerCase().includes(pattern.toLowerCase())
    );
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
      // 解析 diff 内容，提取具体的变更行
      const changeLines = this.parseDiffLines(diff);
      
      if (changeLines.length === 0) {
        return [];
      }
      
      // 智能分组：将连续的变更行分组，避免过度细分
      const lineGroups = this.groupConsecutiveLines(changeLines);
      
      // 为每个组生成审查意见，而不是每行
      const lineReviews = [];
      for (const group of lineGroups) {
        const groupReview = await this.generateGroupReview(fileName, group, existingComments);
        if (groupReview && groupReview.trim() !== '') {
          // 对于同一个代码变更单元，只在最后一行添加审查意见
          const lastLine = group.lines[group.lines.length - 1];
          lineReviews.push({
            lineNumber: lastLine.lineNumber,
            content: lastLine.content,
            review: groupReview,
            groupId: group.id,
            isGroupEnd: true, // 标记这是组的最后一行
            groupSize: group.lines.length // 记录组的大小
          });
        }
      }
      
      return lineReviews;
      
    } catch (err) {
      console.error(`❌ 文件 ${fileName} 审查失败:`, err.message);
      return [];
    }
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

      // 跳过 diff 头部信息
      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d*/);
        if (match) {
          currentLineNumber = parseInt(match[2]);
        }
        continue;
      }

      // 只处理新增的行（以 + 开头），忽略删除的行
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
        // 删除的行不增加行号，也不进行审查
        continue;
      } else if (!line.startsWith("---") && !line.startsWith("+++")) {
        // 未变更的行，增加行号计数
        currentLineNumber++;
      }
    }

    return changeLines;
  }

  /**
   * 将连续的变更行分组，避免过度细分
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 分组后的数组
   */
  groupConsecutiveLines(changeLines) {
    if (changeLines.length === 0) return [];
    
    const groups = [];
    let currentGroup = {
      id: 1,
      lines: [changeLines[0]],
      startLine: changeLines[0].lineNumber,
      endLine: changeLines[0].lineNumber,
      type: 'added' // 现在所有行都是新增的
    };
    
    for (let i = 1; i < changeLines.length; i++) {
      const currentLine = changeLines[i];
      const lastLine = currentGroup.lines[currentGroup.lines.length - 1];
      
      // 如果行号连续，则归为一组
      if (currentLine.lineNumber === lastLine.lineNumber + 1) {
        currentGroup.lines.push(currentLine);
        currentGroup.endLine = currentLine.lineNumber;
      } else {
        // 行号不连续，开始新组
        groups.push(currentGroup);
        currentGroup = {
          id: groups.length + 2,
          lines: [currentLine],
          startLine: currentLine.lineNumber,
          endLine: currentLine.lineNumber,
          type: 'added'
        };
      }
    }
    
    // 添加最后一组
    groups.push(currentGroup);
    
    return groups;
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
      const response = await axios.post(
        `${this.apiURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的代码审查专家。请仔细分析代码，如果发现任何问题或改进点，请提供具体的建议。如果代码完全没有问题，请直接回复'PASS'（不要解释为什么没问题）。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: Math.min(this.maxTokens, 300), // 组级评论可以稍长
          temperature: this.temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const review = response.data.choices[0].message.content.trim();
      
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
      console.error(`❌ 代码组审查失败:`, err.message);
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

    // 检查是否有相同文件的评论
    const fileComments = existingComments.filter(comment => 
      comment.filePath === fileName || comment.filePath === 'general'
    );

    if (fileComments.length === 0) {
      return false;
    }

    // 检查是否有重叠行号的评论
    for (const comment of fileComments) {
      if (this.isCommentOverlapping(comment, startLine, endLine)) {
        
        // 检查评论内容是否相似
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
    // 检查行号范围是否重叠
    if (comment.startLine && comment.endLine) {
      // 如果有行号范围，检查是否重叠
      const isOverlapping = !(endLine < comment.startLine || startLine > comment.endLine);
      return isOverlapping;
    } else if (comment.line) {
      // 如果是单行评论，检查是否在当前范围内
      const isInRange = comment.line >= startLine && comment.line <= endLine;
      return isInRange;
    }
    
    // 如果是通用评论（如 AI 生成的总体评论），也认为可能相关
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

    // 检查评论是否针对类似的问题
    const commonIssues = [
      '注释', 'comment', '无意义', '无用', '删除', 'remove', '删除', '删除',
      '代码质量', '代码规范', '最佳实践', '代码结构', '无效', '冗余'
    ];

    // 如果评论包含常见问题关键词，且代码内容相似，认为评论相似
    const hasCommonIssue = commonIssues.some(issue => 
      commentText.includes(issue)
    );

    if (hasCommonIssue) {
      // 对于注释类问题，使用更宽松的相似性判断
      if (this.isCommentRelatedIssue(commentText, codeContent)) {
        return true;
      }

      // 进一步检查代码内容是否相似（简单的内容匹配）
      const codeWords = codeContent.split(/\s+/).filter(word => word.length > 1);
      const commentWords = commentText.split(/\s+/).filter(word => word.length > 1);
      
      // 计算重叠词数
      const overlapCount = codeWords.filter(word => 
        commentWords.includes(word)
      ).length;

      const similarityRatio = overlapCount / Math.max(codeWords.length, commentWords.length);
      
      // 如果重叠词数超过一定比例，认为相似
      const isSimilar = overlapCount > 0 && similarityRatio > 0.05; // 降低阈值
      
      return isSimilar;
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
    // 检查评论是否提到注释相关问题
    const commentKeywords = ['注释', 'comment', '无意义', '无用', '删除', '无效', '冗余'];
    const hasCommentKeywords = commentKeywords.some(keyword => 
      commentText.includes(keyword)
    );

    // 检查代码是否包含注释
    const hasCommentInCode = codeContent.includes('//') || codeContent.includes('/*') || codeContent.includes('*/');

    // 如果评论提到注释问题，且代码包含注释，认为相关
    if (hasCommentKeywords && hasCommentInCode) {
      // 进一步检查评论的具体建议是否相似
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
}

module.exports = AICodeReviewer;
