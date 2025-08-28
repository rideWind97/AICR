const express = require('express');
const EventHandler = require('../handlers/eventHandler');
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
    version: '1.0.0'
  });
});

/**
 * 查询所有任务状态
 */
router.get('/tasks', (req, res) => {
  try {
    const eventHandler = new EventHandler();
    const tasks = eventHandler.getAllTaskStatus();
    
    res.json({
      success: true,
      data: {
        total: tasks.length,
        tasks: tasks
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
    const eventHandler = new EventHandler();
    const task = eventHandler.getTaskStatus(taskId);
    
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
    const eventHandler = new EventHandler();
    const tasks = eventHandler.getProjectTaskStatus(parseInt(projectId));
    
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
    
    Logger.info('收到GitLab webhook请求', {
      objectKind: event.object_kind,
      action: event.object_attributes?.action,
      projectId: event.project?.id,
      mrIid: event.object_attributes?.iid
    });
    
    // 检查环境变量
    if (!process.env.GITLAB_URL || !process.env.AI_API_KEY) {
      Logger.error('缺少必要的环境变量', null, { 
        hasGitlabUrl: !!process.env.GITLAB_URL,
        hasDeepseekKey: !!process.env.AI_API_KEY 
      });
      return res.status(500).json({ error: 'Missing environment variables' });
    }

    // 验证事件类型
    if (event.object_kind !== 'merge_request') {
      Logger.warn('忽略不支持的事件类型', null, { objectKind: event.object_kind });
      return res.status(200).json({ message: 'Ignored - not a merge request' });
    }

    const action = event.object_attributes?.action;
    
    // 优化1: MR关闭时不需要处理
    if (action === 'close') {
      Logger.info('MR已关闭，跳过处理', { 
        projectId: event.project?.id, 
        mrIid: event.object_attributes?.iid,
        action 
      });
      return res.status(200).json({ message: 'MR closed - no processing needed' });
    }
    
    if (!['open', 'reopen', 'update'].includes(action)) {
      Logger.warn('忽略不支持的操作', null, { action });
      return res.status(200).json({ message: 'Not interested - action not supported' });
    }

    const projectId = event.project?.id;
    const mrIid = event.object_attributes?.iid;

    if (!projectId || !mrIid) {
      Logger.error('缺少必要的事件参数', null, { projectId, mrIid });
      return res.status(400).json({ error: 'Missing project ID or MR IID' });
    }

    // 处理事件 - 异步启动代码审查任务
    const eventHandler = new EventHandler();
    const result = await eventHandler.handleMergeRequestEvent(event);
    
    Logger.endTimer('Webhook处理', startTime, {
      projectId,
      mrIid,
      action,
      success: result.success,
      status: 'async_started'
    });
    
    // 快速响应，不等待代码审查完成
    res.status(200).json({
      ...result,
      note: 'Code review task started asynchronously. Use /api/tasks to check status.',
      webhook_response_time: Date.now() - startTime
    });

  } catch (err) {
    Logger.error('Webhook处理失败', err);
    if (err.response) {
      Logger.error('API响应错误', null, {
        status: err.response.status,
        data: err.response.data
      });
    }
    res.status(500).json({ 
      error: 'Webhook processing failed',
      message: err.message
    });
  }
});

module.exports = router;
