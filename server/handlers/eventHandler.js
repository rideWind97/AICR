const GitLabAPI = require('../services/gitlabAPI');
const AICodeReviewer = require('../services/aiCodeReviewer');
const Logger = require('../utils/logger');

/**
 * 事件处理器类 - 异步处理版本
 */
class EventHandler {
  constructor() {
    this.gitlabAPI = new GitLabAPI();
    this.aiReviewer = new AICodeReviewer();
    this.processingTasks = new Map(); // 跟踪正在处理的任务
  }

  /**
   * 处理 merge_request 事件 - 异步版本
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

      // 优化2: 检查MR的数量限制
      const sizeCheck = await this.checkMRSizeLimits(projectId, mrIid);
      if (!sizeCheck.withinLimits) {
        Logger.warn('MR超出数量限制，跳过处理', {
          projectId,
          mrIid,
          fileCount: sizeCheck.fileCount,
          lineCount: sizeCheck.lineCount,
          limits: { maxFiles: 25, maxLines: 5000 }
        });
        return {
          success: false,
          message: 'MR exceeds size limits',
          details: {
            fileCount: sizeCheck.fileCount,
            lineCount: sizeCheck.lineCount,
            limits: { maxFiles: 25, maxLines: 5000 }
          }
        };
      }

      // 异步启动代码审查任务
      this.startCodeReviewTask('mr', {
        projectId,
        mrIid,
        action,
        eventType: 'merge_request',
        fileCount: sizeCheck.fileCount,
        lineCount: sizeCheck.lineCount
      });

      return {
        success: true,
        message: 'Code review task started asynchronously',
        project_id: projectId,
        mr_iid: mrIid,
        status: 'processing',
        sizeInfo: {
          fileCount: sizeCheck.fileCount,
          lineCount: sizeCheck.lineCount
        }
      };

    } catch (err) {
      console.error('❌ MR 事件处理失败:', err.message);
      throw err;
    }
  }

  /**
   * 检查MR的数量限制
   * @param {number} projectId - 项目ID
   * @param {number} mrIid - MR IID
   * @returns {Promise<Object>} 检查结果
   */
  async checkMRSizeLimits(projectId, mrIid) {
    try {
      const changes = await this.gitlabAPI.getMRChanges(projectId, mrIid);
      if (!changes || changes.length === 0) {
        return { withinLimits: true, fileCount: 0, lineCount: 0 };
      }

      const fileCount = changes.length;
      let totalLineCount = 0;

      // 计算总代码行数
      for (const change of changes) {
        if (change.diff) {
          // 解析diff获取行数变化
          const addedLines = (change.diff.match(/^\+/gm) || []).length;
          const removedLines = (change.diff.match(/^-/gm) || []).length;
          totalLineCount += Math.max(addedLines, removedLines);
        }
      }

      const withinLimits = fileCount < 25 && totalLineCount < 5000;

      Logger.info('MR数量限制检查完成', {
        projectId,
        mrIid,
        fileCount,
        lineCount: totalLineCount,
        withinLimits,
        limits: { maxFiles: 25, maxLines: 5000 }
      });

      return {
        withinLimits,
        fileCount,
        lineCount: totalLineCount
      };

    } catch (err) {
      Logger.error('MR数量限制检查失败', err, { projectId, mrIid });
      // 如果检查失败，默认允许处理
      return { withinLimits: true, fileCount: 0, lineCount: 0 };
    }
  }

  /**
   * 异步启动代码审查任务
   * @param {string} taskType - 任务类型 ('push' 或 'mr')
   * @param {Object} taskData - 任务数据
   */
  startCodeReviewTask(taskType, taskData) {
    const taskId = `${taskType}_${taskData.projectId}_${taskData.mrIid}_${Date.now()}`;
    
    Logger.info('启动异步代码审查任务', {
      taskId,
      taskType,
      projectId: taskData.projectId,
      mrIid: taskData.mrIid
    });

    // 记录任务开始
    this.processingTasks.set(taskId, {
      ...taskData,
      taskId,
      startTime: Date.now(),
      status: 'processing'
    });

    // 异步执行代码审查
    this.executeCodeReviewTask(taskId, taskData).catch(err => {
      Logger.error('异步代码审查任务失败', err, { taskId, taskData });
      
      // 更新任务状态
      const task = this.processingTasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = err.message;
        task.endTime = Date.now();
      }
    });

    // 清理已完成的任务（保留最近100个）
    this.cleanupCompletedTasks();
  }

  /**
   * 执行代码审查任务
   * @param {string} taskId - 任务ID
   * @param {Object} taskData - 任务数据
   */
  async executeCodeReviewTask(taskId, taskData) {
    const { projectId, mrIid, commitId, branch, action, eventType } = taskData;
    
    try {
      Logger.info('开始执行代码审查任务', { taskId, projectId, mrIid });

      // 获取 MR 变更
      const changes = await this.gitlabAPI.getMRChanges(projectId, mrIid);
      if (!changes || changes.length === 0) {
        Logger.warn('MR没有代码变更，跳过审查', { taskId, projectId, mrIid });
        this.updateTaskStatus(taskId, 'completed', 'No changes found');
        return;
      }

      // 获取已有的评论，用于增量型评论检查
      const existingComments = await this.gitlabAPI.getExistingComments(projectId, mrIid);

      // 生成 AI 代码审查
      const fileReviews = await this.aiReviewer.generateCodeReview(changes, existingComments);
      
      // 使用针对性行内评论功能，为每行代码添加具体的审查意见
      await this.gitlabAPI.postInlineCommentsToMR(projectId, mrIid, changes, fileReviews);

      Logger.info('代码审查任务完成', {
        taskId,
        projectId,
        mrIid,
        fileCount: changes.length,
        reviewCount: fileReviews.length
      });

      this.updateTaskStatus(taskId, 'completed', 'Code review completed successfully');

    } catch (err) {
      Logger.error('代码审查任务执行失败', err, { taskId, projectId, mrIid });
      this.updateTaskStatus(taskId, 'failed', err.message);
      throw err;
    }
  }

  /**
   * 更新任务状态
   * @param {string} taskId - 任务ID
   * @param {string} status - 任务状态
   * @param {string} message - 状态消息
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
   * 清理已完成的任务
   */
  cleanupCompletedTasks() {
    const maxTasks = 100;
    if (this.processingTasks.size > maxTasks) {
      const tasks = Array.from(this.processingTasks.entries());
      const completedTasks = tasks.filter(([_, task]) => 
        task.status === 'completed' || task.status === 'failed'
      );
      
      // 按开始时间排序，删除最旧的任务
      completedTasks.sort((a, b) => a[1].startTime - b[1].startTime);
      
      const tasksToRemove = completedTasks.slice(0, this.processingTasks.size - maxTasks);
      tasksToRemove.forEach(([taskId, _]) => {
        this.processingTasks.delete(taskId);
      });
      
      Logger.info('清理已完成的任务', { 
        removedCount: tasksToRemove.length,
        remainingCount: this.processingTasks.size
      });
    }
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务状态
   */
  getTaskStatus(taskId) {
    return this.processingTasks.get(taskId) || null;
  }

  /**
   * 获取所有任务状态
   * @returns {Array} 任务状态数组
   */
  getAllTaskStatus() {
    return Array.from(this.processingTasks.values()).map(task => ({
      taskId: task.taskId,
      projectId: task.projectId,
      mrIid: task.mrIid,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      message: task.message,
      error: task.error
    }));
  }

  /**
   * 获取项目相关的任务状态
   * @param {number} projectId - 项目ID
   * @returns {Array} 项目任务状态数组
   */
  getProjectTaskStatus(projectId) {
    return Array.from(this.processingTasks.values())
      .filter(task => task.projectId === projectId)
      .map(task => ({
        taskId: task.taskId,
        mrIid: task.mrIid,
        status: task.status,
        startTime: task.startTime,
        endTime: task.endTime,
        duration: task.duration,
        message: task.message,
        error: task.error
      }));
  }
}

module.exports = EventHandler;
