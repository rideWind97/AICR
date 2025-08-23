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

// ==================== 服务启动 ====================
const localIP = getLocalIP();
const PORT = process.env.PORT || 3001;

app.listen(PORT, localIP, () => {
  Logger.info('AI CR 服务启动成功', {
    port: PORT,
    ip: localIP,
    webhookUrl: `http://${localIP}:${PORT}/api/gitlab/webhook`,
    healthUrl: `http://${localIP}:${PORT}/api/health`
  });
});