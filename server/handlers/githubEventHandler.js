const GitHubAPI = require('../services/githubAPI');
const AICodeReviewer = require('../services/aiCodeReviewer');
const Logger = require('../utils/logger');

/**
 * GitHub 事件处理器类
 */
class GitHubEventHandler {
  constructor() {
    this.githubAPI = new GitHubAPI();
    this.aiReviewer = new AICodeReviewer();
    this.processingTasks = new Map();
  }

  /**
   * 处理 push 事件
   */
  async handlePushEvent(event) {
    const startTime = Logger.startTimer('GitHub Push事件处理');
    
    try {
      const { repository, ref, after } = event;
      const owner = repository.owner.login || repository.owner.name;
      const repo = repository.name;
      const branch = ref.replace('refs/heads/', '');

      if (!owner || !repo || !after || !branch) {
        Logger.error('缺少必要的事件信息', null, { owner, repo, after, branch });
        throw new Error('Missing repository info, commit ID or branch');
      }

      Logger.info('开始处理GitHub Push事件', { owner, repo, branch, after });

      // 查找关联的 PR
      const pr = await this.githubAPI.findPullRequestByBranch(owner, repo, branch);
      if (!pr) {
        Logger.warn('Push事件未找到关联PR', { owner, repo, branch, after });
        return { message: 'No associated PR found' };
      }

      // 异步启动代码审查任务
      this.startCodeReviewTask('github_push', {
        owner,
        repo,
        prNumber: pr.number,
        commitId: after,
        branch,
        eventType: 'push'
      });

      Logger.endTimer('GitHub Push事件处理', startTime, {
        owner,
        repo,
        prNumber: pr.number,
        commitId: after,
        status: 'async_started'
      });

      return {
        success: true,
        message: 'Code review task started asynchronously',
        owner,
        repo,
        pr_number: pr.number,
        commit_id: after,
        status: 'processing'
      };

    } catch (err) {
      Logger.error('GitHub Push事件处理失败', err);
      throw err;
    }
  }

  /**
   * 处理 pull_request 事件
   */
  async handlePullRequestEvent(event) {
    try {
      const action = event.action;
      if (!['opened', 'reopened', 'synchronize'].includes(action)) {
        return { message: 'Not interested - action not supported' };
      }

      const { repository, pull_request } = event;
      const owner = repository.owner.login || repository.owner.name;
      const repo = repository.name;
      const prNumber = pull_request.number;

      if (!owner || !repo || !prNumber) {
        Logger.error('缺少必要的PR信息', null, { owner, repo, prNumber });
        throw new Error('Missing repository info or PR number');
      }

      Logger.info('开始处理GitHub PR事件', { owner, repo, prNumber, action });

      // 先获取PR变更内容以检查标题
      const changes = await this.githubAPI.getPRChanges(owner, repo, prNumber);
      
      // 检查是否需要跳过代码审查（优先检查）
      if (changes && changes.skipReview) {
        Logger.info(`🚫 跳过代码审查: ${changes.title}`);
        return {
          success: true,
          message: 'Code review skipped - PR title contains "no-cr"',
          owner,
          repo,
          pr_number: prNumber,
          skipped: true,
          reason: 'PR标题包含"no-cr"'
        };
      }

      // 检查PR的大小限制
      const sizeCheck = await this.checkPRSizeLimits(owner, repo, prNumber);
      if (sizeCheck.skipReview) {
        Logger.info(`🚫 跳过代码审查: ${changes.title}`);
        return {
          success: true,
          message: 'Code review skipped - PR title contains "no-cr"',
          owner,
          repo,
          pr_number: prNumber,
          skipped: true,
          reason: 'PR标题包含"no-cr"'
        };
      }
      if (!sizeCheck.withinLimits) {
        Logger.warn('PR超出数量限制，跳过处理', {
          owner,
          repo,
          prNumber,
          fileCount: sizeCheck.fileCount,
          lineCount: sizeCheck.lineCount
        });
        return { message: 'PR too large for review' };
      }
      
      if (!changes || changes.length === 0) {
        Logger.warn('PR没有变更内容', { owner, repo, prNumber });
        return { message: 'No changes to review' };
      }

      // 获取已有评论
      const existingComments = await this.githubAPI.getExistingComments(owner, repo, prNumber);

      // 生成AI代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(changes, existingComments);

      // 发布行内评论
      await this.githubAPI.postInlineCommentsToPR(owner, repo, prNumber, changes, fileReviews);

      // 添加总结评论
      if (fileReviews.length > 0) {
        const summaryComment = this.generateSummaryComment(fileReviews);
        await this.githubAPI.postCommentToPR(owner, repo, prNumber, summaryComment);
      }

      Logger.info('GitHub PR代码审查完成', {
        owner,
        repo,
        prNumber,
        reviewedFiles: fileReviews.length
      });

      return {
        success: true,
        message: 'Code review completed',
        owner,
        repo,
        pr_number: prNumber,
        reviewed_files: fileReviews.length
      };

    } catch (err) {
      Logger.error('GitHub PR事件处理失败', err);
      throw err;
    }
  }

  /**
   * 检查PR的大小限制
   */
  async checkPRSizeLimits(owner, repo, prNumber) {
    try {
      const changes = await this.githubAPI.getPRChanges(owner, repo, prNumber);
      if (!changes) {
        return { withinLimits: false, fileCount: 0, lineCount: 0 };
      }

      // 如果PR需要跳过审查，则不需要检查大小限制
      if (changes.skipReview) {
        return { withinLimits: true, fileCount: 0, lineCount: 0, skipReview: true };
      }

      const fileCount = changes.length;
      const lineCount = changes.reduce((total, change) => {
        return total + (change.additions || 0) + (change.deletions || 0);
      }, 0);

      const withinLimits = fileCount <= 50 && lineCount <= 1000;

      return {
        withinLimits,
        fileCount,
        lineCount
      };

    } catch (err) {
      Logger.error('检查PR大小限制失败', err);
      return { withinLimits: false, fileCount: 0, lineCount: 0 };
    }
  }

  /**
   * 启动代码审查任务
   */
  startCodeReviewTask(taskType, taskData) {
    const taskId = `${taskType}_${Date.now()}`;
    
    this.processingTasks.set(taskId, {
      ...taskData,
      status: 'processing',
      startTime: Date.now()
    });

    // 异步执行代码审查
    this.executeCodeReview(taskId, taskData).catch(err => {
      Logger.error('代码审查任务执行失败', err, { taskId, taskData });
      this.updateTaskStatus(taskId, 'failed', err.message);
    });
  }

  /**
   * 执行代码审查
   */
  async executeCodeReview(taskId, taskData) {
    try {
      const { owner, repo, prNumber } = taskData;
      
      // 获取PR变更内容
      const changes = await this.githubAPI.getPRChanges(owner, repo, prNumber);
      
      // 检查是否需要跳过代码审查
      if (changes && changes.skipReview) {
        Logger.info(`🚫 跳过代码审查: ${changes.title}`);
        this.updateTaskStatus(taskId, 'completed', `Code review skipped - PR title contains "no-cr"`);
        return;
      }
      
      if (!changes || changes.length === 0) {
        this.updateTaskStatus(taskId, 'completed', 'No changes to review');
        return;
      }

      // 生成AI代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(changes, []);

      // 发布行内评论
      await this.githubAPI.postInlineCommentsToPR(owner, repo, prNumber, changes, fileReviews);

      // 添加总结评论
      if (fileReviews.length > 0) {
        const summaryComment = this.generateSummaryComment(fileReviews);
        await this.githubAPI.postCommentToPR(owner, repo, prNumber, summaryComment);
      }

      this.updateTaskStatus(taskId, 'completed', 'Review completed successfully');

    } catch (err) {
      Logger.error('代码审查执行失败', err, { taskId, taskData });
      this.updateTaskStatus(taskId, 'failed', err.message);
      throw err;
    }
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId, status, message) {
    const task = this.processingTasks.get(taskId);
    if (task) {
      task.status = status;
      task.message = message;
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;
    }
  }

  /**
   * 生成总结评论
   */
  generateSummaryComment(fileReviews) {
    const totalFiles = fileReviews.length;
    const totalComments = fileReviews.reduce((sum, file) => {
      return sum + file.review.filter(r => r.review && r.review.trim() !== '').length;
    }, 0);

    return `## 🤖 AI 代码审查完成

📊 **审查统计**
- 审查文件数: ${totalFiles}
- 发现问题数: ${totalComments}

${totalComments > 0 ? '⚠️ 请查看行内评论了解具体问题' : '✅ 代码质量良好，未发现明显问题'}

---
*此评论由 AI 代码审查系统自动生成*`;
  }

  /**
   * 获取所有任务状态
   */
  getAllTaskStatus() {
    return Array.from(this.processingTasks.values());
  }

  /**
   * 获取特定任务状态
   */
  getTaskStatus(taskId) {
    return this.processingTasks.get(taskId);
  }
}

module.exports = GitHubEventHandler;
