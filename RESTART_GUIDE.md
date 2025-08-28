# AI Code Reviewer 服务重启机制使用指南

## 概述

本项目提供了多种服务重启机制，确保服务在遇到问题时能够自动恢复，提高系统的稳定性和可靠性。

## 重启机制类型

### 1. 进程管理器 (推荐)

使用自定义的进程管理器，提供自动重启、健康检查和进程监控功能。

**启动方式：**
```bash
# 使用进程管理器启动（默认）
npm start

# 或者明确指定
npm run start:managed
```

**特性：**
- 自动重启子进程
- 健康检查（每30秒）
- 内存使用监控
- 优雅关闭处理
- 最大重启次数限制（10次）
- 重启延迟（5秒）

### 2. PM2 进程管理

使用 PM2 进行进程管理，适合生产环境。

**安装 PM2：**
```bash
npm install -g pm2
```

**启动方式：**
```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 重启服务
pm2 restart ai-code-reviewer

# 停止服务
pm2 stop ai-code-reviewer

# 查看日志
pm2 logs ai-code-reviewer
```

**特性：**
- 自动重启
- 内存限制重启（500MB）
- 日志管理
- 进程监控
- 集群模式支持

### 3. 直接启动

直接启动服务，适合开发环境。

**启动方式：**
```bash
npm run start:direct
```

## 监控和诊断

### 使用监控脚本

项目提供了内置的监控脚本，可以检查服务状态和执行重启操作。

```bash
# 检查服务状态
npm run monitor

# 检查健康状态
npm run monitor:health

# 检查任务状态
npm run monitor:tasks

# 重启服务
npm run monitor:restart

# 显示帮助
node scripts/monitor.js help
```

### 健康检查端点

服务提供了健康检查端点：

```bash
curl http://localhost:3001/api/health
```

响应示例：
```json
{
  "status": "OK",
  "timestamp": "2025-01-XX XX:XX:XX.XXXZ",
  "service": "MG AI Code Reviewer",
  "version": "1.0.0"
}
```

### 任务状态查询

查看当前运行的任务：

```bash
curl http://localhost:3001/api/tasks
```

## 配置选项

### 进程管理器配置

在 `server/processManager.js` 中可以调整以下参数：

```javascript
this.maxRestarts = 10;           // 最大重启次数
this.restartDelay = 5000;        // 重启延迟（毫秒）
this.healthCheckInterval = 30000; // 健康检查间隔（毫秒）
```

### PM2 配置

在 `ecosystem.config.js` 中可以调整：

```javascript
max_memory_restart: '500M',      // 内存限制
max_restarts: 10,                // 最大重启次数
restart_delay: 5000,             // 重启延迟
min_uptime: '10s',               // 最小运行时间
```

## 故障排除

### 常见问题

1. **服务无法启动**
   - 检查端口是否被占用
   - 检查环境变量配置
   - 查看错误日志

2. **频繁重启**
   - 检查内存使用情况
   - 查看错误日志
   - 调整重启延迟

3. **健康检查失败**
   - 检查服务是否正常运行
   - 检查网络连接
   - 查看服务日志

### 日志位置

- **进程管理器日志**：控制台输出
- **PM2 日志**：`pm2 logs ai-code-reviewer`
- **应用日志**：通过 Logger 输出

### 手动重启步骤

1. 停止当前服务
2. 检查错误日志
3. 修复问题
4. 重新启动服务

## 最佳实践

1. **生产环境**：使用 PM2 或进程管理器
2. **开发环境**：使用直接启动或 nodemon
3. **监控**：定期检查服务状态和日志
4. **备份**：定期备份配置和数据
5. **测试**：在生产部署前测试重启机制

## 环境变量

确保以下环境变量已正确配置：

```bash
# GitLab 配置
GITLAB_URL=https://gitlab.example.com
BOT_TOKEN=your_bot_token

# AI API 配置
AI_API_KEY=your_ai_api_key

# 服务配置
PORT=3001
NODE_ENV=production
```

## 联系支持

如果遇到问题，请：

1. 查看日志文件
2. 检查配置参数
3. 使用监控脚本诊断
4. 提交 Issue 到项目仓库
