const express = require('express');
const GitlabEventHandler = require('../handlers/gitlabEventHandler');
const GitHubEventHandler = require('../handlers/githubEventHandler');
const Logger = require('../utils/logger');

const router = express.Router();

/**
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'MG AI Code Reviewer',
    version: '1.0.0',
    supported_platforms: ['GitLab', 'GitHub']
  });
});

/**
 * 查询所有任务状态
 */
router.get('/tasks', (req, res) => {
  try {
    const gitlabEventHandler = new GitlabEventHandler();
    const githubEventHandler = new GitHubEventHandler();
    
    const gitlabTasks = gitlabEventHandler.getAllTaskStatus();
    const githubTasks = githubEventHandler.getAllTaskStatus();
    
    const allTasks = [...gitlabTasks, ...githubTasks];
    
    res.json({
      success: true,
      data: {
        total: allTasks.length,
        gitlab_tasks: gitlabTasks.length,
        github_tasks: githubTasks.length,
        tasks: allTasks
      }
    });
  } catch (err) {
    Logger.error('查询任务状态失败', err);
    res.status(500).json({ 
      error: 'Failed to get task status',
      message: err.message
    });
  }
});

/**
 * 查询特定任务状态
 */
router.get('/tasks/:taskId', (req, res) => {
  try {
    const { taskId } = req.params;
    const gitlabEventHandler = new GitlabEventHandler();
    const githubEventHandler = new GitHubEventHandler();
    
    let task = gitlabEventHandler.getTaskStatus(taskId);
    if (!task) {
      task = githubEventHandler.getTaskStatus(taskId);
    }
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found',
        taskId 
      });
    }
    
    res.json({
      success: true,
      data: task
    });
  } catch (err) {
    Logger.error('查询任务状态失败', err);
    res.status(500).json({ 
      error: 'Failed to get task status',
      message: err.message
    });
  }
});

/**
 * 查询项目相关任务状态
 */
router.get('/projects/:projectId/tasks', (req, res) => {
  try {
    const { projectId } = req.params;
    const gitlabEventHandler = new GitlabEventHandler();
    const tasks = gitlabEventHandler.getProjectTaskStatus(parseInt(projectId));
    
    res.json({
      success: true,
      data: {
        projectId: parseInt(projectId),
        total: tasks.length,
        tasks: tasks
      }
    });
  } catch (err) {
    Logger.error('查询项目任务状态失败', err);
    res.status(500).json({ 
      error: 'Failed to get project task status',
      message: err.message
    });
  }
});

/**
 * GitLab Webhook 入口 - 异步处理版本
 */
router.post('/gitlab/webhook', async (req, res) => {
  const startTime = Logger.startTimer('Webhook处理');
  
  try {
    const event = req.body;
    const eventType = event.object_kind;
    
    Logger.info('收到GitLab webhook事件', { 
      eventType,
      projectId: event.project?.id,
      userId: event.user?.id
    });

    // 验证事件类型
    if (!['push', 'merge_request'].includes(eventType)) {
      Logger.warn('不支持的事件类型', null, { eventType });
      return res.status(200).json({ 
        message: 'Event type not supported',
        eventType 
      });
    }

    const gitlabEventHandler = new GitlabEventHandler();
    let result;

    if (eventType === 'push') {
      result = await gitlabEventHandler.handlePushEvent(event);
    } else if (eventType === 'merge_request') {
      result = await gitlabEventHandler.handleMergeRequestEvent(event);
    }

    Logger.endTimer('Webhook处理', startTime, {
      eventType,
      result: result?.message || 'Unknown'
    });

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      result
    });

  } catch (err) {
    Logger.error('GitLab webhook处理失败', err);
    Logger.endTimer('Webhook处理', startTime, { error: err.message });
    
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: err.message
    });
  }
});

/**
 * GitHub Webhook 入口
 */
router.post('/github/webhook', async (req, res) => {
  const startTime = Logger.startTimer('GitHub Webhook处理');
  
  try {
    const event = req.body;
    const eventType = req.headers['x-github-event'];
    
    Logger.info('收到GitHub webhook事件', { 
      eventType,
      repository: event.repository?.full_name,
      sender: event.sender?.login
    });

    // 验证事件类型
    if (!['push', 'pull_request'].includes(eventType)) {
      Logger.warn('不支持的GitHub事件类型', null, { eventType });
      return res.status(200).json({ 
        message: 'Event type not supported',
        eventType 
      });
    }

    const githubEventHandler = new GitHubEventHandler();
    let result;

    if (eventType === 'push') {
      result = await githubEventHandler.handlePushEvent(event);
    } else if (eventType === 'pull_request') {
      result = await githubEventHandler.handlePullRequestEvent(event);
    }

    Logger.endTimer('GitHub Webhook处理', startTime, {
      eventType,
      result: result?.message || 'Unknown'
    });

    res.status(200).json({
      success: true,
      message: 'GitHub webhook processed successfully',
      eventType,
      result
    });

  } catch (err) {
    Logger.error('GitHub webhook处理失败', err);
    Logger.endTimer('GitHub Webhook处理', startTime, { error: err.message });
    
    res.status(500).json({ 
      error: 'GitHub webhook processing failed',
      message: err.message
    });
  }
});

module.exports = router;
