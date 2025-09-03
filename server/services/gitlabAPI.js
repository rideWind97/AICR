const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * GitLab API 操作服务类
 */
class GitLabAPI {
  constructor() {
    this.baseURL = process.env.GITLAB_URL;
    this.token = process.env.BOT_TOKEN;
  }

  /**
   * 获取 MR 变更内容（包含 SHA 信息）
   * @param {number} projectId - 项目 ID
   * @param {number} mrIid - MR IID
   * @returns {Promise<Array|null>} 变更内容数组或 null
   */
  async getMRChanges(projectId, mrIid) {
    try {
      // 首先获取 MR 详细信息
      const mrResponse = await axios.get(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}`,
        { 
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      
      const mrInfo = mrResponse.data;
      
      // 获取 MR 变更
      const changesResponse = await axios.get(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes`,
        { 
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      
      const changes = changesResponse.data.changes;
      if (!changes || changes.length === 0) {
        return null;
      }
      
      // 为每个变更添加必要的 SHA 信息
      const enrichedChanges = changes.map(change => ({
        ...change,
        base_sha: mrInfo.diff_refs?.base_sha || mrInfo.sha,
        start_sha: mrInfo.diff_refs?.start_sha || mrInfo.sha,
        head_sha: mrInfo.diff_refs?.head_sha || mrInfo.sha
      }));
      
      return enrichedChanges;

    } catch (err) {
      Logger.error('❌ 获取 MR 变更失败:', err.message);
      throw err;
    }
  }

  /**
   * 向 MR 发布行内评论（在具体代码行下）
   * @param {number} projectId - 项目 ID
   * @param {number} mrIid - MR IID
   * @param {Array} changes - 代码变更数组
   * @param {Array} fileReviews - 每个文件的审查内容数组
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<void>}
   */
  async postInlineCommentsToMR(projectId, mrIid, changes, fileReviews, existingComments = []) {
    try {
      // 将 AI 审查内容按文件分组，为每行生成针对性评论
      const fileComments = this.parseReviewToFileComments(changes, fileReviews, existingComments);
      
      // 为每个文件添加行内评论
      for (const fileComment of fileComments) {
        if (fileComment.comments.length > 0) {
          await this.addInlineCommentsToFile(projectId, mrIid, fileComment, existingComments);
        }
      }
      
      Logger.info('✅ 针对性行内评论发布成功');
    } catch (err) {
      Logger.error('❌ 发布针对性行内评论失败:', err.message);
      throw err;
    }
  }

  /**
   * 解析 AI 审查内容，按文件分组并生成针对性行内评论
   * @param {Array} changes - 代码变更数组
   * @param {Array} fileReviews - 每个文件的审查内容数组
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Array} 按文件分组的评论数组
   */
  parseReviewToFileComments(changes, fileReviews, existingComments = []) {
    const fileComments = [];
    
    for (const change of changes) {
      const filePath = change.new_path || change.old_path;
      const fileComment = {
        filePath: filePath,
        comments: []
      };
      
      // 检查是否有必要的 SHA 信息
      if (!change.base_sha || !change.start_sha || !change.head_sha) {
        Logger.info(`⚠️ 文件 ${filePath} 缺少 SHA 信息，跳过行内评论`);
        continue;
      }
      
      // 找到对应的文件审查
      const fileReview = fileReviews.find(fr => fr.filePath === filePath);
      if (!fileReview) {
        Logger.info(`⚠️ 文件 ${filePath} 没有对应的审查内容`);
        continue;
      }
      
      // 直接使用 AI 生成的评论，不需要重新解析 diff
      // 因为 AI 已经为每个代码变更单元生成了评论
      for (const lineReview of fileReview.review) {
        if (lineReview.isGroupEnd) {
          // 检查该行是否已经有评论
          const hasExistingComment = this.checkIfLineHasComment(existingComments, filePath, lineReview.lineNumber);
          
          if (hasExistingComment) {
            Logger.info(`⚠️ 文件 ${filePath} 第 ${lineReview.lineNumber} 行已有评论，跳过重复评论`);
            continue;
          }
          
          Logger.info(`📝 为文件 ${filePath} 第 ${lineReview.lineNumber} 行（代码变更单元结尾）添加评论: ${lineReview.review.substring(0, 50)}...`);
          
          fileComment.comments.push({
            line: lineReview.lineNumber,
            note: lineReview.review,
            position: {
              base_sha: change.base_sha,
              start_sha: change.start_sha,
              head_sha: change.head_sha,
              old_path: change.old_path,
              new_path: change.new_path,
              position_type: 'text',
              old_line: null, // 新增的行，old_line 为 null
              new_line: lineReview.lineNumber
            }
          });
        }
      }
      
      if (fileComment.comments.length > 0) {
        fileComments.push(fileComment);
        Logger.info(`✅ 文件 ${filePath} 准备添加 ${fileComment.comments.length} 个行内评论`);
      }
    }
    
    return fileComments;
  }

  /**
   * 检查指定文件的指定行是否已经有评论
   * @param {Array} existingComments - 已有的评论数组
   * @param {string} filePath - 文件路径
   * @param {number} lineNumber - 行号
   * @returns {boolean} 是否已有评论
   */
  checkIfLineHasComment(existingComments, filePath, lineNumber) {
    return existingComments.some(comment => {
      // 检查是否是同一文件的同一行
      if (comment.filePath === filePath && comment.line === lineNumber) {
        return true;
      }
      
      // 检查是否是行号范围内的评论
      if (comment.filePath === filePath && 
          comment.startLine && comment.endLine && 
          lineNumber >= comment.startLine && lineNumber <= comment.endLine) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * 为单个文件添加行内评论
   * @param {number} projectId - 项目 ID
   * @param {number} mrIid - MR IID
   * @param {Object} fileComment - 文件评论对象
   * @param {Array} existingComments - 已有的评论数组
   * @returns {Promise<void>}
   */
  async addInlineCommentsToFile(projectId, mrIid, fileComment, existingComments = []) {
    try {
      Logger.info(`📝 为文件 ${fileComment.filePath} 添加行内评论...`);
      
      // 为每个评论行添加行内评论
      for (const comment of fileComment.comments) {
        try {
          // 发布前再次检查是否已有评论（双重保险）
          const hasExistingComment = this.checkIfLineHasComment(existingComments, fileComment.filePath, comment.line);
          
          if (hasExistingComment) {
            Logger.info(`⚠️ 发布前检查：文件 ${fileComment.filePath} 第 ${comment.line} 行已有评论，跳过发布`);
            continue;
          }
          
          Logger.info(`🔍 添加行内评论: 行 ${comment.line}, 文件: ${comment.position.new_path}`);
          
          // 使用 /discussions 端点，通过 position 参数在具体代码行下添加评论
          await axios.post(
            `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`,
            {
              body: comment.note,
              position: {
                base_sha: comment.position.base_sha,
                start_sha: comment.position.start_sha,
                head_sha: comment.position.head_sha,
                old_path: comment.position.old_path,
                new_path: comment.position.new_path,
                position_type: 'text',
                old_line: comment.position.old_line,
                new_line: comment.position.new_line
              }
            },
            { 
              headers: { 'PRIVATE-TOKEN': this.token },
              timeout: 10000
            }
          );
          
          // 添加延迟避免 API 频率限制
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (err) {
          Logger.error(`❌ 行内评论失败 (行 ${comment.line}):`, err.message);
          if (err.response) {
            Logger.error('API 响应:', err.response.status, err.response.data);
          }
          throw err;
        }
      }
      
      Logger.info(`✅ 文件 ${fileComment.filePath} 的行内评论添加完成`);
    } catch (err) {
      Logger.error(`❌ 为文件 ${fileComment.filePath} 添加行内评论失败:`, err.message);
      throw err;
    }
  }

  /**
   * 向 MR 发布普通评论
   * @param {number} projectId - 项目 ID
   * @param {number} mrIid - MR IID
   * @param {string} comment - 评论内容
   * @returns {Promise<void>}
   */
  async postCommentToMR(projectId, mrIid, comment) {
    try {
      Logger.info('💬 添加审查评论到 MR...');
      await axios.post(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
        { body: comment },
        { 
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      Logger.info('✅ 评论发布成功');
    } catch (err) {
      Logger.error('❌ 发布评论失败:', err.message);
      throw err;
    }
  }

  /**
   * 获取 MR 中已有的评论
   * @param {number} projectId - 项目 ID
   * @param {number} mrIid - MR IID
   * @returns {Promise<Array>} 已有评论数组
   */
  async getExistingComments(projectId, mrIid) {
    try {
      Logger.info('📋 获取 MR 中已有的评论...');
      
      // 使用 notes API 获取评论，这个更可靠
      const response = await axios.get(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
        { 
          params: {
            per_page: 100, // 获取更多评论
            sort: 'desc'   // 最新的评论在前
          },
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      
      const notes = response.data;
      const comments = [];
      
      Logger.info(`🔍 获取到 ${notes.length} 个 notes，开始解析...`);
      
      for (const note of notes) {
        // 检查是否有位置信息（行内评论）
        if (note.position && note.position.new_line) {
          Logger.info(`📝 发现行内评论: 文件 ${note.position.new_path}, 行 ${note.position.new_line}`);
          comments.push({
            filePath: note.position.new_path,
            line: note.position.new_line,
            startLine: note.position.new_line,
            endLine: note.position.new_line,
            note: note.body,
            noteId: note.id,
            createdAt: note.created_at
          });
        } else if (note.body && note.body.includes('AI Code Review')) {
          // 检查是否是 AI 生成的评论
          Logger.info(`🤖 发现 AI 评论: ${note.body.substring(0, 50)}...`);
          comments.push({
            filePath: 'general',
            line: null,
            startLine: null,
            endLine: null,
            note: note.body,
            noteId: note.id,
            createdAt: note.created_at,
            isAIGenerated: true
          });
        }
      }
      
      Logger.info(`✅ 成功解析出 ${comments.length} 个已有评论`);
      
      // 调试输出
      if (comments.length > 0) {
        comments.forEach((comment, index) => {
          Logger.info(`  评论 ${index + 1}: 文件=${comment.filePath}, 行=${comment.line}, 内容=${comment.note.substring(0, 30)}...`);
        });
      }
      
      return comments;
      
    } catch (err) {
      Logger.error('❌ 获取已有评论失败:', err.message);
      if (err.response) {
        Logger.error('API 响应状态:', err.response.status);
        Logger.error('API 响应数据:', err.response.data);
      }
      return [];
    }
  }
}

module.exports = GitLabAPI;
