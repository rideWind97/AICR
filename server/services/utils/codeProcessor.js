/**
 * 代码处理工具类
 */
const AI_REVIEW_CONFIG = require('../config/aiReviewConfig');

class CodeProcessor {
  /**
   * 智能预过滤代码行
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 过滤后的变更行数组
   */
  static preFilterCodeLines(changeLines) {
    return changeLines.filter((line) => {
      const content = line.content.trim();
      
      // 长度检查
      if (!this.isValidContentLength(content)) {
        return false;
      }
      
      // 跳过模式检查
      if (this.matchesSkipPatterns(content)) {
        return false;
      }
      
      // 空白内容检查
      if (!this.isNotJustWhitespace(content)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 检查内容长度是否有效
   * @param {string} content - 内容
   * @returns {boolean} 是否有效
   */
  static isValidContentLength(content) {
    const { minLength, maxLength } = AI_REVIEW_CONFIG.quickCheckRules;
    
    if (content.length < minLength) {
      return false;
    }
    
    if (content.length > maxLength) {
      return true; // 内容过长，直接保留无需进一步检查
    }
    
    return true;
  }

  /**
   * 检查是否匹配跳过模式
   * @param {string} content - 内容
   * @returns {boolean} 是否匹配跳过模式
   */
  static matchesSkipPatterns(content) {
    return AI_REVIEW_CONFIG.skipPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 检查是否不只是空白内容
   * @param {string} content - 内容
   * @returns {boolean} 是否不只是空白
   */
  static isNotJustWhitespace(content) {
    if (!AI_REVIEW_CONFIG.quickCheckRules.notJustWhitespace) {
      return false;
    }
    
    return !/^\s*$/.test(content);
  }

  /**
   * 优化代码行分组策略
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 优化后的分组数组
   */
  static optimizeLineGroups(changeLines) {
    return this.groupLines(changeLines, true);
  }

  /**
   * 将连续的变更行分组（基础版本）
   * @param {Array} changeLines - 变更行数组
   * @returns {Array} 分组后的数组
   */
  static groupConsecutiveLines(changeLines) {
    return this.groupLines(changeLines, false);
  }

  /**
   * 通用的代码行分组方法
   * @param {Array} changeLines - 变更行数组
   * @param {boolean} useSmartGrouping - 是否使用智能分组
   * @returns {Array} 分组后的数组
   */
  static groupLines(changeLines, useSmartGrouping = false) {
    if (changeLines.length === 0) return [];

    const groups = [];
    let currentGroup = this.createNewGroup(changeLines[0], 1);

    for (let i = 1; i < changeLines.length; i++) {
      const currentLine = changeLines[i];
      const lastLine = currentGroup.lines[currentGroup.lines.length - 1];

      const shouldStartNewGroup = useSmartGrouping 
        ? this.shouldStartNewGroup(currentLine, lastLine, currentGroup)
        : this.shouldStartNewGroupBasic(currentLine, lastLine, currentGroup);

      if (shouldStartNewGroup) {
        groups.push(currentGroup);
        currentGroup = this.createNewGroup(currentLine, groups.length + 1);
      } else {
        this.addLineToGroup(currentGroup, currentLine);
      }
    }

    groups.push(currentGroup);
    return groups;
  }

  /**
   * 创建新的代码组
   * @param {Object} line - 代码行
   * @param {number} id - 组ID
   * @returns {Object} 新的代码组
   */
  static createNewGroup(line, id) {
    return {
      id,
      lines: [line],
      startLine: line.lineNumber,
      endLine: line.lineNumber,
      type: "added",
    };
  }

  /**
   * 向代码组添加行
   * @param {Object} group - 代码组
   * @param {Object} line - 代码行
   */
  static addLineToGroup(group, line) {
    group.lines.push(line);
    group.endLine = line.lineNumber;
  }

  /**
   * 基础分组判断（只考虑行号连续性）
   * @param {Object} currentLine - 当前行
   * @param {Object} lastLine - 上一行
   * @param {Object} currentGroup - 当前组
   * @returns {boolean} 是否应该开始新组
   */
  static shouldStartNewGroupBasic(currentLine, lastLine, currentGroup) {
    return currentLine.lineNumber !== lastLine.lineNumber + 1;
  }

  /**
   * 判断是否应该开始新组 - 智能语义判断
   * @param {Object} currentLine - 当前行
   * @param {Object} lastLine - 上一行
   * @param {Object} currentGroup - 当前组
   * @returns {boolean} 是否应该开始新组
   */
  static shouldStartNewGroup(currentLine, lastLine, currentGroup) {
    // 1. 行号不连续，必须分组
    if (currentLine.lineNumber !== lastLine.lineNumber + 1) {
      return true;
    }

    // 2. 超过最大行数限制，必须分组
    if (currentGroup.lines.length >= AI_REVIEW_CONFIG.performance.maxLinesPerGroup) {
      return true;
    }

    // 3. 智能语义边界检测
    const currentContent = currentLine.content.trim();
    const lastContent = lastLine.content.trim();

    // 3.1 函数边界检测 - 只在函数开始时分组
    if (this.isFunctionStart(currentContent)) {
      return true;
    }

    // 3.2 类/对象边界检测 - 只在类/对象开始时分组
    if (this.isClassObjectStart(currentContent)) {
      return true;
    }

    // 3.3 注释块边界检测
    if (this.isCommentBlockBoundary(currentContent, lastContent)) {
      return true;
    }

    return false;
  }

  /**
   * 检测函数开始
   */
  static isFunctionStart(currentContent) {
    const functionStartPatterns = [
      /^\s*(function|async\s+function|const\s+\w+\s*=\s*(async\s+)?\(|let\s+\w+\s*=\s*(async\s+)?\(|var\s+\w+\s*=\s*(async\s+)?\()/,
      /^\s*(\w+)\s*:\s*(async\s+)?\(/, // 对象方法
      /^\s*static\s+(async\s+)?\w+\s*\(/, // 静态方法
    ];

    return functionStartPatterns.some(pattern => pattern.test(currentContent));
  }

  /**
   * 检测类/对象开始
   */
  static isClassObjectStart(currentContent) {
    const classObjectPatterns = [
      /^\s*(class|interface|type|enum)\s+\w+/,
      /^\s*export\s+(class|interface|type|enum)/,
    ];

    return classObjectPatterns.some(pattern => pattern.test(currentContent));
  }

  /**
   * 检测代码块边界
   */
  static isCodeBlockBoundary(currentContent, lastContent) {
    // 只对重要的控制结构进行分组，避免过度分割
    const importantControlPatterns = [
      /^\s*(switch|try|catch|finally)\s*\(/, // 重要的控制结构
      /^\s*}\s*(else|catch|finally)\s*{/, // 控制结构的分支
      /^\s*case\s+/, // switch case
      /^\s*default\s*:/, // switch default
    ];

    // 只在重要的控制结构结束时分组
    const isImportantBlockEnd = currentContent === '}' && 
                               lastContent !== '{' && 
                               (lastContent.includes('switch') || 
                                lastContent.includes('try') || 
                                lastContent.includes('catch') ||
                                lastContent.includes('finally'));

    return importantControlPatterns.some(pattern => pattern.test(currentContent)) || isImportantBlockEnd;
  }

  /**
   * 检测类/对象边界
   */
  static isClassObjectBoundary(currentContent, lastContent) {
    const classObjectPatterns = [
      /^\s*(class|interface|type|enum)\s+\w+/,
      /^\s*export\s+(class|interface|type|enum)/,
      /^\s*}\s*;?\s*$/, // 类/对象结束
    ];

    return classObjectPatterns.some(pattern => pattern.test(currentContent));
  }

  /**
   * 检测注释块边界
   */
  static isCommentBlockBoundary(currentContent, lastContent) {
    // 注释块开始/结束
    const commentPatterns = [
      /^\s*\/\*\*/, // JSDoc开始
      /^\s*\*\/\s*$/, // 注释块结束
      /^\s*\/\*/, // 多行注释开始
    ];

    return commentPatterns.some(pattern => pattern.test(currentContent));
  }

  /**
   * 解析 diff 内容，提取变更行信息
   * @param {string} diff - diff 内容
   * @returns {Array} 变更行信息数组
   */
  static parseDiffLines(diff) {
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
   * 过滤有意义的审查意见
   * @param {Array} reviews - 审查意见数组
   * @returns {Array} 过滤后的审查意见
   */
  static filterMeaningfulReviews(reviews) {
    if (!reviews || reviews.length === 0) return [];

    const meaningfulReviews = [];
    const seenContent = new Set();

    for (const review of reviews) {
      if (!review.review || review.review.trim() === "") {
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
  static isLowQualityReview(review) {
    // 统一转换为小写，避免重复转换
    const reviewLower = review.toLowerCase();
    
    // 检查低质量模式
    if (this.matchesLowQualityPatterns(reviewLower)) {
      return true;
    }

    // 检查冗余模式
    if (this.matchesVerbosePatterns(review)) {
      return true;
    }

    // 检查空词过多
    if (this.hasTooManyEmptyWords(review, reviewLower)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否匹配低质量模式
   * @param {string} reviewLower - 小写的审查意见
   * @returns {boolean} 是否匹配
   */
  static matchesLowQualityPatterns(reviewLower) {
    return AI_REVIEW_CONFIG.lowQualityPatterns.some(pattern =>
      reviewLower.includes(pattern.toLowerCase())
    );
  }

  /**
   * 检查是否匹配冗余模式
   * @param {string} review - 审查意见
   * @returns {boolean} 是否匹配
   */
  static matchesVerbosePatterns(review) {
    return AI_REVIEW_CONFIG.verbosePatterns.some(pattern => {
      const regex = new RegExp(pattern, "i");
      return regex.test(review);
    });
  }

  /**
   * 检查是否包含过多空词
   * @param {string} review - 审查意见
   * @param {string} reviewLower - 小写的审查意见
   * @returns {boolean} 是否包含过多空词
   */
  static hasTooManyEmptyWords(review, reviewLower) {
    if (review.length <= 100) {
      return false;
    }
    
    const emptyWordCount = AI_REVIEW_CONFIG.emptyWords.filter(word =>
      reviewLower.includes(word)
    ).length;
    
    return emptyWordCount >= 5;
  }

  /**
   * 工具方法：数组分块
   */
  static chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = CodeProcessor;
