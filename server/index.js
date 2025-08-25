// server.js（Express 版）
const express = require('express');
require('dotenv').config();

// 导入模块
const { getLocalIP } = require('./utils/helpers');
const webhookRoutes = require('./routes/webhook');
const githubRoutes = require('./routes/github');
const modelRoutes = require('./routes/models');
const Logger = require('./utils/logger');

// ==================== 配置和初始化 ====================
const app = express();
app.use(express.json());

// ==================== 路由注册 ====================
app.use('/api', webhookRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/models', modelRoutes);

// ==================== 健康检查接口 ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    features: ['multi-model-ai', 'gitlab-integration', 'github-integration', 'code-review']
  });
});

// ==================== 404 处理 ====================
app.use('*', (req, res) => {
  Logger.warn('访问不存在的路径', null, { 
    path: req.originalUrl,
    method: req.method,
    ip: req.ip 
  });
  
  res.status(404).json({ 
    error: 'Not Found',
    message: `路径 ${req.originalUrl} 不存在`,
    timestamp: new Date().toISOString()
  });
});

// ==================== 全局错误处理 ====================
app.use((err, req, res, next) => {
  Logger.error('服务器错误', err, {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// ==================== 服务启动 ====================
const localIP = getLocalIP();
const PORT = process.env.PORT || 3001;

app.listen(PORT, localIP, () => {
  Logger.info('多模型AI代码审查服务启动成功', {
    port: PORT,
    ip: localIP,
    webhookUrl: `http://${localIP}:${PORT}/api/gitlab/webhook`,
    githubWebhookUrl: `http://${localIP}:${PORT}/api/github/webhook`,
    healthUrl: `http://${localIP}:${PORT}/api/health`,
    modelsUrl: `http://${localIP}:${PORT}/api/models`,
    version: '2.0.0'
  });
});