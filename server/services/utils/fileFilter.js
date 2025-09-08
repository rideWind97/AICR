/**
 * 文件过滤工具类
 */
const AI_REVIEW_CONFIG = require('../config/aiReviewConfig');

class FileFilter {
  /**
   * 判断变更是否重要，需要审查
   * @param {string} diff - diff 内容
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否需要审查
   */
  static isSignificantChange(diff, fileName) {
    // 检查文件类型特殊处理
    if (fileName) {
      const specialAction = this.checkSpecialFileHandling(fileName, diff);
      if (specialAction !== null) {
        return specialAction;
      }
    }

    // 检查基本变更条件
    return this.hasBasicChanges(diff);
  }

  /**
   * 检查文件类型特殊处理
   * @param {string} fileName - 文件名
   * @param {string} diff - diff 内容
   * @returns {boolean|null} 特殊处理结果，null表示无特殊处理
   */
  static checkSpecialFileHandling(fileName, diff) {
    const fileNameLower = fileName.toLowerCase();

    // 检查特殊处理文件类型
    for (const [type, config] of Object.entries(AI_REVIEW_CONFIG.fileTypeRules.specialHandling)) {
      if (config.enabled && this.matchesPatterns(fileNameLower, config.patterns)) {
        return this.handleSpecialFileType(config.action, diff);
      }
    }

    // 检查是否在完全跳过的扩展名列表中
    if (this.matchesExtensions(fileNameLower, AI_REVIEW_CONFIG.fileTypeRules.ignoredExtensions)) {
      return false;
    }

    return null; // 无特殊处理
  }

  /**
   * 处理特殊文件类型
   * @param {string} action - 处理动作
   * @param {string} diff - diff 内容
   * @returns {boolean} 是否需要审查
   */
  static handleSpecialFileType(action, diff) {
    switch (action) {
      case "skip":
        return false;
      case "syntaxOnly":
        return this.hasSyntaxIssues(diff);
      case "skipStyle":
        return this.shouldReviewVueFile(diff);
      default:
        return true;
    }
  }

  /**
   * 检查基本变更条件
   * @param {string} diff - diff 内容
   * @returns {boolean} 是否有基本变更
   */
  static hasBasicChanges(diff) {
    const addedLineCount = this.countAddedLines(diff);
    
    if (addedLineCount === 0) {
      return false;
    }

    if (this.isFormatOnlyChange(diff)) {
      return false;
    }

    return true;
  }

  /**
   * 统计新增行数
   * @param {string} diff - diff 内容
   * @returns {number} 新增行数
   */
  static countAddedLines(diff) {
    const lines = diff.split("\n");
    let addedLineCount = 0;

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        addedLineCount++;
      }
    }

    return addedLineCount;
  }

  /**
   * 检查文件名是否匹配指定的模式
   */
  static matchesPatterns(fileNameLower, patterns) {
    return this.matchesPatternsGeneric(fileNameLower, patterns, 'includes');
  }

  /**
   * 检查文件名是否以指定的扩展名结尾
   */
  static matchesExtensions(fileNameLower, extensions) {
    return this.matchesPatternsGeneric(fileNameLower, extensions, 'endsWith');
  }

  /**
   * 通用模式匹配函数
   * @param {string} fileNameLower - 小写的文件名
   * @param {Array} patterns - 模式数组
   * @param {string} matchType - 匹配类型：'includes' 或 'endsWith'
   * @returns {boolean} 是否匹配
   */
  static matchesPatternsGeneric(fileNameLower, patterns, matchType) {
    return patterns.some(pattern => {
      const patternLower = pattern.toLowerCase();
      
      switch (matchType) {
        case 'includes':
          return fileNameLower.includes(patternLower);
        case 'endsWith':
          return fileNameLower.endsWith(patternLower);
        default:
          return false;
      }
    });
  }

  /**
   * 检查lock文件是否有语法问题
   */
  static hasSyntaxIssues(diff) {
    const lines = diff.split("\n");

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        const content = line.substring(1).trim();

        if (this.hasSyntaxProblem(content)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查内容是否有语法问题
   * @param {string} content - 内容
   * @returns {boolean} 是否有语法问题
   */
  static hasSyntaxProblem(content) {
    return content.includes("{{") || content.includes("}}") || 
           content.includes("<<") || content.includes(">>");
  }

  /**
   * 检查Vue文件是否需要审查（跳过style部分）
   */
  static shouldReviewVueFile(diff) {
    const { addedLineCount } = this.analyzeVueFileChanges(diff);
    
    if (addedLineCount === 0) {
      return false;
    }

    return !this.hasOnlyStyleChanges(diff);
  }

  /**
   * 检查是否只包含style部分的变更
   */
  static hasOnlyStyleChanges(diff) {
    const { hasStyleChanges, hasNonStyleChanges } = this.analyzeVueFileChanges(diff);
    return hasStyleChanges && !hasNonStyleChanges;
  }

  /**
   * 分析Vue文件变更（公共逻辑）
   * @param {string} diff - diff 内容
   * @returns {Object} 分析结果
   */
  static analyzeVueFileChanges(diff) {
    const lines = diff.split("\n");
    let addedLineCount = 0;
    let hasStyleChanges = false;
    let hasNonStyleChanges = false;
    let inStyleSection = false;

    for (const line of lines) {
      const content = line.substring(1).trim();

      // 检查style标签边界
      if (this.isStyleTag(content)) {
        inStyleSection = !inStyleSection;
        continue;
      }

      // 统计新增行
      if (line.startsWith("+") && !line.startsWith("+++")) {
        addedLineCount++;
        
        if (inStyleSection) {
          hasStyleChanges = true;
        } else {
          hasNonStyleChanges = true;
        }
      }
    }

    return { addedLineCount, hasStyleChanges, hasNonStyleChanges, inStyleSection };
  }

  /**
   * 检查是否为style标签
   * @param {string} content - 内容
   * @returns {boolean} 是否为style标签
   */
  static isStyleTag(content) {
    return content.includes("<style") || content.includes("</style>");
  }

  /**
   * 检查是否为纯格式变动
   */
  static isFormatOnlyChange(diff) {
    const { addedLines, removedLines } = this.parseDiffLines(diff);

    if (addedLines.length === 0 && removedLines.length === 0) {
      return false;
    }

    // 检查空白字符变更
    if (this.hasOnlyWhitespaceChanges(addedLines, removedLines)) {
      return true;
    }

    // 检查注释格式变更
    if (this.hasOnlyCommentFormatChanges(addedLines, removedLines)) {
      return true;
    }

    // 检查内容规范化后是否相同
    if (this.hasOnlyNormalizedChanges(addedLines, removedLines)) {
      return true;
    }

    return false;
  }

  /**
   * 解析diff行
   * @param {string} diff - diff 内容
   * @returns {Object} 解析结果
   */
  static parseDiffLines(diff) {
    const lines = diff.split("\n");
    const addedLines = [];
    const removedLines = [];

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        addedLines.push(line.substring(1).trim());
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        removedLines.push(line.substring(1).trim());
      }
    }

    return { addedLines, removedLines };
  }

  /**
   * 检查是否只有空白字符变更
   * @param {Array} addedLines - 新增行
   * @param {Array} removedLines - 删除行
   * @returns {boolean} 是否只有空白变更
   */
  static hasOnlyWhitespaceChanges(addedLines, removedLines) {
    return addedLines.every(line => /^\s*$/.test(line)) &&
           removedLines.every(line => /^\s*$/.test(line));
  }

  /**
   * 检查是否只有注释格式变更
   * @param {Array} addedLines - 新增行
   * @param {Array} removedLines - 删除行
   * @returns {boolean} 是否只有注释格式变更
   */
  static hasOnlyCommentFormatChanges(addedLines, removedLines) {
    const isCommentLine = line => 
      line.startsWith("//") || line.startsWith("/*") || 
      line.startsWith("*") || line.startsWith("*/");

    return addedLines.every(isCommentLine) && removedLines.every(isCommentLine);
  }

  /**
   * 检查是否只有规范化后的变更
   * @param {Array} addedLines - 新增行
   * @param {Array} removedLines - 删除行
   * @returns {boolean} 是否只有规范化变更
   */
  static hasOnlyNormalizedChanges(addedLines, removedLines) {
    const minLength = Math.min(addedLines.length, removedLines.length);
    
    for (let i = 0; i < minLength; i++) {
      const added = addedLines[i];
      const removed = removedLines[i];
      const addedNormalized = added.replace(/\s+/g, "");
      const removedNormalized = removed.replace(/\s+/g, "");

      if (addedNormalized === removedNormalized && addedNormalized !== "") {
        return true;
      }
    }

    return false;
  }
}

module.exports = FileFilter;
