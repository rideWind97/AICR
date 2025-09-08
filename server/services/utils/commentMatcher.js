/**
 * 评论匹配工具类
 */
class CommentMatcher {
  /**
   * 检查是否已有相关评论
   * @param {Array} existingComments - 已有评论数组
   * @param {string} fileName - 文件名
   * @param {number} startLine - 开始行号
   * @param {number} endLine - 结束行号
   * @param {Array} lines - 代码行数组
   * @returns {boolean} 是否已有相关评论
   */
  static hasSimilarComment(existingComments, fileName, startLine, endLine, lines) {
    if (!existingComments || existingComments.length === 0) {
      return false;
    }

    const fileComments = existingComments.filter(
      (comment) =>
        comment.filePath === fileName || comment.filePath === "general"
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
  static isCommentOverlapping(comment, startLine, endLine) {
    if (comment.startLine && comment.endLine) {
      const isOverlapping = !(
        endLine < comment.startLine || startLine > comment.endLine
      );
      return isOverlapping;
    } else if (comment.line) {
      const isInRange = comment.line >= startLine && comment.line <= endLine;
      return isInRange;
    }

    if (comment.filePath === "general") {
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
  static isCommentSimilar(comment, lines) {
    if (!comment.note || !comment.note.trim()) {
      return false;
    }

    const commentText = comment.note.toLowerCase();
    const codeContent = lines
      .map((line) => line.content)
      .join(" ")
      .toLowerCase();

    const commonIssues = [
      "注释", "comment", "无意义", "无用", "删除", "remove",
      "代码质量", "代码规范", "最佳实践", "代码结构", "无效", "冗余",
    ];

    const hasCommonIssue = commonIssues.some((issue) =>
      commentText.includes(issue)
    );

    if (hasCommonIssue) {
      if (this.isCommentRelatedIssue(commentText, codeContent)) {
        return true;
      }

      const codeWords = codeContent
        .split(/\s+/)
        .filter((word) => word.length > 1);
      const commentWords = commentText
        .split(/\s+/)
        .filter((word) => word.length > 1);

      const overlapCount = codeWords.filter((word) =>
        commentWords.includes(word)
      ).length;

      const similarityRatio =
        overlapCount / Math.max(codeWords.length, commentWords.length);

      const isSimilar = overlapCount > 0 && similarityRatio > 0.05;

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
  static isCommentRelatedIssue(commentText, codeContent) {
    const commentKeywords = [
      "注释", "comment", "无意义", "无用", "删除", "无效", "冗余",
    ];
    const hasCommentKeywords = commentKeywords.some((keyword) =>
      commentText.includes(keyword)
    );

    const hasCommentInCode =
      codeContent.includes("//") ||
      codeContent.includes("/*") ||
      codeContent.includes("*/");

    if (hasCommentKeywords && hasCommentInCode) {
      const similarSuggestions = [
        "删除", "remove", "替换", "replace", "避免", "avoid",
      ];

      const hasSimilarSuggestion = similarSuggestions.some((suggestion) =>
        commentText.includes(suggestion)
      );

      return hasSimilarSuggestion;
    }

    return false;
  }
}

module.exports = CommentMatcher;
