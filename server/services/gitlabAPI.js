const axios = require('axios');
const Logger = require('../utils/logger');
const { ignoreCr } = require('../config');

/**
 * 极简化 GitLab 代码审查服务
 */
class SimpleGitlabCR {
  constructor() {
    this.baseURL = process.env.GITLAB_URL;
    this.token = process.env.BOT_TOKEN;
  }

  /**
   * 获取 MR 变更内容
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
      
      // 检查MR标题是否包含"no-cr"，如果包含则跳过代码审查
      if (mrInfo.title && mrInfo.title.toLowerCase().includes(ignoreCr)) {
        Logger.info(`🚫 MR标题包含"no-cr"，跳过代码审查: ${mrInfo.title}`);
        return { skipReview: true, title: mrInfo.title };
      }
      
      // 获取 MR 变更
      const changesResponse = await axios.get(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes`,
        { 
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      
      const changes = changesResponse.data.changes || [];
      
      // 为每个变更添加必要的 SHA 信息
      const enrichedChanges = changes.map(change => ({
        ...change,
        base_sha: mrInfo.diff_refs?.base_sha || mrInfo.sha,
        start_sha: mrInfo.diff_refs?.start_sha || mrInfo.sha,
        head_sha: mrInfo.diff_refs?.head_sha || mrInfo.sha
      }));
      
      return enrichedChanges;
    } catch (err) {
      Logger.error('获取 MR 变更失败:', err.message);
      return [];
    }
  }

  /**
   * 获取已有评论（支持分页）
   */
  async getExistingComments(projectId, mrIid) {
    try {
      let allNotes = [];
      let page = 1;
      const perPage = 100; // GitLab API 每页最大 100 条
      
      // 分页获取所有评论
      while (true) {
        const response = await axios.get(
          `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes?page=${page}&per_page=${perPage}`,
          { 
            headers: { 'PRIVATE-TOKEN': this.token },
            timeout: 10000
          }
        );
        
        const notes = response.data;
        allNotes = allNotes.concat(notes);
        
        // 如果返回的评论数少于每页数量，说明已经是最后一页
        if (notes.length < perPage) {
          break;
        }
        
        page++;
        
        // 避免 API 频率限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      Logger.info(`🔍 获取到 ${allNotes.length} 个 notes，开始解析...`);
      
      const comments = [];
      
      for (const note of allNotes) {
        // 检查是否有位置信息（行内评论）
        if (note.position && note.position.new_line) {
          comments.push({
            filePath: note.position.new_path,
            line: note.position.new_line,
            startLine: note.position.new_line,
            endLine: note.position.new_line,
            note: note.body,
            noteId: note.id,
            createdAt: note.created_at
          });
        } else if (note.body && note.body.includes('AI Review')) {
          // 检查是否是 AI 生成的评论
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
      return comments;
      
    } catch (err) {
      Logger.error('获取已有评论失败:', err.message);
      return [];
    }
  }

  /**
   * 检查行是否已有评论
   */
  hasCommentOnLine(existingComments, filePath, lineNumber) {
    return existingComments.some(comment => 
      comment.filePath === filePath && comment.line === lineNumber
    );
  }

  /**
   * 发布行内评论
   */
  async postInlineComment(projectId, mrIid, filePath, lineNumber, comment, change) {
    try {
      // 使用 discussions API 来发布行内评论
      // 根据 GitLab API 文档，position 参数需要正确的格式
      const position = {
        base_sha: change.base_sha,
        start_sha: change.start_sha,
        head_sha: change.head_sha,
        old_path: change.old_path,
        new_path: change.new_path,
        position_type: 'text',
        old_line: null,
        new_line: lineNumber
      };

      Logger.info(`🔍 发布行内评论: ${filePath}:${lineNumber}`, { position });

      await axios.post(
        `${this.baseURL}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`,
        {
          body: comment,
          position: position
        },
        { 
          headers: { 'PRIVATE-TOKEN': this.token },
          timeout: 10000
        }
      );
      
      Logger.info(`✅ 评论发布成功: ${filePath}:${lineNumber}`);
      return true;
    } catch (err) {
      Logger.error(`❌ 评论发布失败: ${filePath}:${lineNumber}`, err.message);
      if (err.response) {
        Logger.error('API 响应状态:', err.response.status);
        Logger.error('API 响应数据:', err.response.data);
      }
      return false;
    }
  }

  /**
   * 执行代码审查（支持大量文件）
   */
  async executeCodeReview(projectId, mrIid, fileReviews) {
    try {
      // 获取变更和已有评论
      const changes = await this.getMRChanges(projectId, mrIid);
      
      // 检查是否需要跳过代码审查
      if (changes && changes.skipReview) {
        Logger.info(`🚫 跳过代码审查: ${changes.title}`);
        return {
          successCount: 0,
          skippedCount: 0,
          totalProcessed: 0,
          filesProcessed: 0,
          skipped: true,
          reason: 'MR标题包含"no-cr"'
        };
      }
      
      const existingComments = await this.getExistingComments(projectId, mrIid);
      
      if (!changes.length) {
        Logger.info('没有代码变更，跳过审查');
        return;
      }

      // 文件数量限制和性能优化
      const MAX_FILES = 100; // 最大处理文件数
      const MAX_COMMENTS_PER_FILE = 10; // 每个文件最大评论数
      const API_DELAY = 200; // API 调用延迟（毫秒）

      if (fileReviews.length > MAX_FILES) {
        Logger.warn(`⚠️ 文件数量过多 (${fileReviews.length})，限制处理前 ${MAX_FILES} 个文件`);
        fileReviews = fileReviews.slice(0, MAX_FILES);
      }

      let successCount = 0;
      let skipCount = 0;
      let totalProcessed = 0;

      Logger.info(`开始处理 ${fileReviews.length} 个文件的代码审查`);

      // 遍历每个文件的审查结果
      for (const fileReview of fileReviews) {
        const filePath = fileReview.filePath;
        
        // 找到对应的变更获取 SHA
        const change = changes.find(c => (c.new_path || c.old_path) === filePath);
        if (!change) {
          Logger.warn(`⚠️ 未找到文件 ${filePath} 对应的变更信息`);
          continue;
        }

        let fileCommentCount = 0;

        // 处理每行评论
        for (const lineReview of fileReview.review) {
          if (!lineReview.isGroupEnd) continue;
          
          // 限制每个文件的评论数量
          if (fileCommentCount >= MAX_COMMENTS_PER_FILE) {
            Logger.warn(`⚠️ 文件 ${filePath} 评论数量超限，跳过剩余评论`);
            break;
          }
          
          const lineNumber = lineReview.lineNumber;
          
          // 检查是否已有评论
          if (this.hasCommentOnLine(existingComments, filePath, lineNumber)) {
            Logger.info(`⚠️ 跳过重复评论: ${filePath}:${lineNumber}`);
            skipCount++;
            continue;
          }
          
          // 发布评论
          const success = await this.postInlineComment(
            projectId, 
            mrIid, 
            filePath, 
            lineNumber, 
            lineReview.review,
            change
          );
          
          if (success) {
            successCount++;
            fileCommentCount++;
            totalProcessed++;
          }
          
          // 避免 API 频率限制
          await new Promise(resolve => setTimeout(resolve, API_DELAY));
        }

        Logger.info(`📁 文件 ${filePath} 处理完成: ${fileCommentCount} 个评论`);
      }
      
      Logger.info(`代码审查完成: 成功 ${successCount} 个，跳过 ${skipCount} 个，总计处理 ${totalProcessed} 个评论`);
      
      return {
        successCount,
        skippedCount: skipCount,
        totalProcessed,
        filesProcessed: fileReviews.length
      };
      
    } catch (err) {
      Logger.error('代码审查执行失败:', err.message);
      throw err;
    }
  }
}

module.exports = SimpleGitlabCR;
