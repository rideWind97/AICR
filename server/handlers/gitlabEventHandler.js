const Logger = require('../utils/logger');
const AICodeReviewer = require('../services/aiCodeReviewer');
const GitlabCR = require('../services/gitlabAPI');

/**
 * 极简化事件处理器
 */
class GitlabEventHandler {
  constructor() {
    this.aiReviewer = new AICodeReviewer();
    this.gitlabCR = new GitlabCR();
    this.tasks = new Map(); // 简单的任务状态管理
  }

  /**
   * 处理推送事件
   */
  async handlePushEvent(event) {
    try {
      const { project_id, ref, commits } = event;
      
      Logger.info(`处理推送事件: 项目 ${project_id}, 分支 ${ref}`);
      
      // 推送事件暂时不处理代码审查，只记录
      return { message: 'Push event received, no action needed' };
      
    } catch (err) {
      Logger.error('推送事件处理失败:', err.message);
      throw err;
    }
  }

  /**
   * 处理合并请求事件
   */
  async handleMergeRequestEvent(event) {
    try {
      const { project, object_attributes } = event;
      const { iid, action, state, last_commit } = object_attributes;
      const projectId = project.id;
      
      Logger.info(`处理 MR 事件: 项目 ${projectId}, MR ${iid}, 动作 ${action}, 状态 ${state}`);
      
      // 只在 MR 打开或更新时进行代码审查
      if (action === 'open' || action === 'update') {
        let lastCommitSha = null;
        
        // 如果是更新操作，获取最后一次commit的SHA
        if (action === 'update' && last_commit && last_commit.id) {
          lastCommitSha = last_commit.id;
          Logger.info(`🔄 MR更新检测到新commit: ${lastCommitSha}`);
        }
        
        // 异步执行代码审查，不等待完成
        this.handleMREvent(projectId, iid, action, lastCommitSha).catch(error => {
          Logger.error('异步代码审查失败:', error.message);
        });
        return { message: 'MR code review task started' };
      }
      
      return { message: `MR ${action} event processed` };
      
    } catch (err) {
      Logger.error('MR 事件处理失败:', err.message);
      throw err;
    }
  }

  /**
   * 处理 MR 事件
   * @param {string} projectId - 项目ID
   * @param {string} mrIid - MR IID
   * @param {string} action - MR动作 (open/update)
   * @param {string} lastCommitSha - 最后一次commit的SHA (仅在update时使用)
   */
  async handleMREvent(projectId, mrIid, action = 'open', lastCommitSha = null) {
    const startTime = Date.now();
    
    try {
      Logger.info(`开始异步处理 MR: ${projectId}/${mrIid} (动作: ${action})`);

      // 获取 MR 变更
      const changes = await this.gitlabCR.getMRChanges(projectId, mrIid, action, lastCommitSha);
      
      // 检查是否需要跳过代码审查
      if (changes && changes.skipReview) {
        Logger.info(`🚫 跳过代码审查: ${changes.title}`);
        return;
      }
      
      if (!changes.length) {
        Logger.info('没有代码变更，跳过审查');
        return;
      }

      // 获取已有评论
      const existingComments = await this.gitlabCR.getExistingComments(projectId, mrIid);
      Logger.info(`开始生成智能代码审查`, { 
        fileCount: changes.length, 
        existingCommentsCount: existingComments.length,
        action: action,
        lastCommitSha: lastCommitSha
      });

      // 生成 AI 代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(
        changes, 
        existingComments,
        {
          projectId: projectId,
          ref: lastCommitSha || 'main',
          gitlabAPI: this.gitlabAPI
        }
      );
      
      // 打印所有文件审查结果
      Logger.info(`🎯 所有文件审查结果汇总:`, {
        totalFiles: changes.length,
        reviewedFiles: fileReviews.length,
        action: action,
        fileReviews: fileReviews.map(fr => ({
          filePath: fr.filePath,
          reviewCount: fr.review ? fr.review.length : 0,
          reviews: fr.review ? fr.review.map(r => ({
            lineNumber: r.lineNumber,
            review: r.review.substring(0, 100) + '...'
          })) : []
        }))
      });
      
      if (!fileReviews.length) {
        Logger.info('没有生成审查内容，跳过发布');
        return;
      }

      // 执行代码审查
      const result = await this.gitlabCR.executeCodeReview(projectId, mrIid, fileReviews, action, lastCommitSha);
      Logger.info(`代码审查完成: 成功 ${result.successCount} 个，跳过 ${result.skippedCount} 个`);

      Logger.info('MR 异步处理完成', { 
        operation: 'MR异步处理', 
        duration: Date.now() - startTime,
        action: action
      });
      
    } catch (err) {
      Logger.error('MR 异步处理失败:', err.message);
      throw err;
    }
  }

  /**
   * 获取所有任务状态
   */
  getAllTaskStatus() {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取特定任务状态
   */
  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 获取项目相关任务状态
   */
  getProjectTaskStatus(projectId) {
    return Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId);
  }
}

module.exports = GitlabEventHandler;
