// server.js（Express 版）
const express = require('express');
require('dotenv').config();

// 导入模块
const { getLocalIP } = require('./utils/helpers');
const webhookRoutes = require('./routes/webhook');
const Logger = require('./utils/logger');

// ==================== 配置和初始化 ====================
const app = express();
app.use(express.json());

// ==================== 路由注册 ====================
app.use('/api', webhookRoutes);

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

// ==================== 进程间通信处理 ====================
if (process.send) {
  // 处理来自父进程的消息
  process.on('message', (message) => {
    if (message.type === 'health_check') {
      // 发送健康状态回父进程
      process.send({
        type: 'health',
        status: 'healthy',
        timestamp: Date.now(),
        pid: process.pid
      });
    }
  });

  // 通知父进程服务已启动
  process.send({
    type: 'service_started',
    status: 'ready',
    timestamp: Date.now(),
    pid: process.pid
  });
}

// ==================== 服务启动 ====================
const localIP = getLocalIP();
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, localIP, () => {
  Logger.info('AI CR 服务启动成功', {
    port: PORT,
    ip: localIP,
    webhookUrl: `http://${localIP}:${PORT}/api/gitlab/webhook`,
    healthUrl: `http://${localIP}:${PORT}/api/health`
  });
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  Logger.info('收到SIGTERM信号，开始优雅关闭服务');
  server.close(() => {
    Logger.info('HTTP服务已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('收到SIGINT信号，开始优雅关闭服务');
  server.close(() => {
    Logger.info('HTTP服务已关闭');
    process.exit(0);
  });
});