const GitLabAPI = require('../services/gitlabAPI');
const AICodeReviewer = require('../services/aiCodeReviewer');
const Logger = require('../utils/logger');

/**
 * 事件处理器类
 */
class EventHandler {
  constructor() {
    this.gitlabAPI = new GitLabAPI();
    this.aiReviewer = new AICodeReviewer();
  }

  /**
   * 处理 push 事件
   * @param {Object} event - push 事件数据
   * @returns {Promise<Object>} 处理结果
   */
  async handlePushEvent(event) {
    const startTime = Logger.startTimer('Push事件处理');
    
    try {
      const projectId = event.project?.id;
      const commitId = event.after;
      const branch = event.ref?.replace('refs/heads/', '');

      if (!projectId || !commitId || !branch) {
        Logger.error('缺少必要的事件信息', null, { projectId, commitId, branch });
        throw new Error('Missing project ID, commit ID or branch');
      }

      Logger.info('开始处理Push事件', { projectId, branch, commitId });

      // 查找关联的 MR
      const mr = await this.gitlabAPI.findMergeRequestByBranch(projectId, branch);
      if (!mr) {
        Logger.warn('Push事件未找到关联MR', { projectId, branch, commitId });
        return { message: 'No associated MR found' };
      }

      // 获取 MR 的最新变更
      const changes = await this.gitlabAPI.getMRChanges(projectId, mr.iid);
      if (!changes || changes.length === 0) {
        Logger.warn('MR没有代码变更', { projectId, mrIid: mr.iid });
        return { message: 'No changes in MR' };
      }

      // 获取已有的评论，用于增量型评论检查
      const existingComments = await this.gitlabAPI.getExistingComments(projectId, mr.iid);

      // 生成 AI 代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(changes, existingComments);
      
      // 使用针对性行内评论功能，为每行代码添加具体的审查意见
      await this.gitlabAPI.postInlineCommentsToMR(projectId, mr.iid, changes, fileReviews);

      Logger.endTimer('Push事件处理', startTime, {
        projectId,
        mrIid: mr.iid,
        commitId,
        fileCount: changes.length,
        reviewCount: fileReviews.length
      });

      return {
        success: true,
        message: 'Code review completed for push-triggered MR',
        project_id: projectId,
        mr_iid: mr.iid,
        commit_id: commitId
      };

    } catch (err) {
      Logger.error('Push事件处理失败', err);
      throw err;
    }
  }

  /**
   * 处理 merge_request 事件
   * @param {Object} event - merge_request 事件数据
   * @returns {Promise<Object>} 处理结果
   */
  async handleMergeRequestEvent(event) {
    try {
      const action = event.object_attributes?.action;
      if (!['open', 'reopen', 'update'].includes(action)) {
        return { message: 'Not interested - action not supported' };
      }

      const projectId = event.project?.id;
      const mrIid = event.object_attributes?.iid;

      if (!projectId || !mrIid) {
        console.error('❌ 缺少项目 ID 或 MR IID');
        throw new Error('Missing project ID or MR IID');
      }

      // 获取 MR 变更
      const changes = await this.gitlabAPI.getMRChanges(projectId, mrIid);
      if (!changes || changes.length === 0) {
        return { message: 'No changes found' };
      }

      // 获取已有的评论，用于增量型评论检查
      const existingComments = await this.gitlabAPI.getExistingComments(projectId, mrIid);

      // 生成 AI 代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(changes, existingComments);
      
      // 使用针对性行内评论功能，为每行代码添加具体的审查意见
      await this.gitlabAPI.postInlineCommentsToMR(projectId, mrIid, changes, fileReviews);

      return {
        success: true,
        message: 'Code review completed and posted to MR',
        project_id: projectId,
        mr_iid: mrIid
      };

    } catch (err) {
      console.error('❌ MR 事件处理失败:', err.message);
      throw err;
    }
  }
}

module.exports = EventHandler;
