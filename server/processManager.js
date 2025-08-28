const { spawn, fork } = require('child_process');
const path = require('path');
const Logger = require('./utils/logger');

/**
 * 进程管理器 - 提供自动重启、健康检查和进程监控功能
 */
class ProcessManager {
  constructor() {
    this.childProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 5000; // 5秒
    this.healthCheckInterval = 30000; // 30秒
    this.healthCheckTimer = null;
    this.isShuttingDown = false;
    
    // 绑定事件处理器
    this.handleExit = this.handleExit.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    
    // 注册进程信号处理
    this.setupSignalHandlers();
  }

  /**
   * 启动子进程
   */
  start() {
    if (this.childProcess) {
      Logger.warn('子进程已在运行中');
      return;
    }

    try {
      Logger.info('启动子进程', { restartCount: this.restartCount });
      
      // 使用 fork 启动子进程
      this.childProcess = fork(path.join(__dirname, 'index.js'), [], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
      });

      // 绑定事件监听器
      this.childProcess.on('exit', this.handleExit);
      this.childProcess.on('error', this.handleError);
      this.childProcess.on('disconnect', this.handleDisconnect);
      this.childProcess.on('message', this.handleMessage.bind(this));

      // 启动健康检查
      this.startHealthCheck();

      Logger.info('子进程启动成功', { 
        pid: this.childProcess.pid,
        restartCount: this.restartCount 
      });

    } catch (err) {
      Logger.error('启动子进程失败', err);
      this.scheduleRestart();
    }
  }

  /**
   * 停止子进程
   */
  stop() {
    if (!this.childProcess) {
      return;
    }

    Logger.info('停止子进程', { pid: this.childProcess.pid });
    
    // 清理健康检查定时器
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // 发送停止信号
    this.childProcess.kill('SIGTERM');
    
    // 强制停止（如果5秒内没有响应）
    setTimeout(() => {
      if (this.childProcess && !this.childProcess.killed) {
        Logger.warn('强制停止子进程', { pid: this.childProcess.pid });
        this.childProcess.kill('SIGKILL');
      }
    }, 5000);
  }

  /**
   * 重启子进程
   */
  restart() {
    if (this.isShuttingDown) {
      return;
    }

    Logger.info('重启子进程', { restartCount: this.restartCount });
    
    this.stop();
    
    // 延迟重启，避免频繁重启
    setTimeout(() => {
      this.start();
    }, this.restartDelay);
  }

  /**
   * 处理子进程退出
   */
  handleExit(code, signal) {
    Logger.info('子进程退出', { 
      code, 
      signal, 
      restartCount: this.restartCount,
      pid: this.childProcess?.pid 
    });

    this.childProcess = null;

    // 如果不是主动关闭，则尝试重启
    if (!this.isShuttingDown && this.restartCount < this.maxRestarts) {
      this.restartCount++;
      this.scheduleRestart();
    } else if (this.restartCount >= this.maxRestarts) {
      Logger.error('达到最大重启次数，停止重启', { 
        maxRestarts: this.maxRestarts,
        restartCount: this.restartCount 
      });
      process.exit(1);
    }
  }

  /**
   * 处理子进程错误
   */
  handleError(err) {
    Logger.error('子进程错误', err, { 
      pid: this.childProcess?.pid,
      restartCount: this.restartCount 
    });
  }

  /**
   * 处理子进程断开连接
   */
  handleDisconnect() {
    Logger.warn('子进程断开连接', { 
      pid: this.childProcess?.pid,
      restartCount: this.restartCount 
    });
  }

  /**
   * 处理子进程消息
   */
  handleMessage(message) {
    if (message && message.type === 'health') {
      Logger.debug('收到子进程健康状态', { 
        status: message.status,
        timestamp: message.timestamp 
      });
    }
  }

  /**
   * 安排重启
   */
  scheduleRestart() {
    if (this.isShuttingDown) {
      return;
    }

    Logger.info('安排重启子进程', { 
      delay: this.restartDelay,
      restartCount: this.restartCount 
    });

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.start();
      }
    }, this.restartDelay);
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    if (!this.childProcess || this.childProcess.killed) {
      Logger.warn('子进程不存在或已停止，跳过健康检查');
      return;
    }

    try {
      // 检查进程是否还在运行
      if (!this.childProcess.connected) {
        Logger.warn('子进程连接断开，触发重启');
        this.restart();
        return;
      }

      // 发送健康检查消息
      this.childProcess.send({ type: 'health_check' });

      // 检查进程内存使用情况
      const usage = process.memoryUsage();
      if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
        Logger.warn('内存使用过高，考虑重启', { 
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB'
        });
      }

    } catch (err) {
      Logger.error('健康检查失败', err);
    }
  }

  /**
   * 设置信号处理器
   */
  setupSignalHandlers() {
    // 优雅关闭
    process.on('SIGTERM', () => {
      Logger.info('收到SIGTERM信号，开始优雅关闭');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      Logger.info('收到SIGINT信号，开始优雅关闭');
      this.gracefulShutdown();
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (err) => {
      Logger.error('未捕获的异常', err);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('未处理的Promise拒绝', { reason, promise });
      this.gracefulShutdown();
    });
  }

  /**
   * 优雅关闭
   */
  gracefulShutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    Logger.info('开始优雅关闭进程管理器');

    // 停止子进程
    this.stop();

    // 清理定时器
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // 延迟退出，给子进程时间清理
    setTimeout(() => {
      Logger.info('进程管理器关闭完成');
      process.exit(0);
    }, 2000);
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      childProcessRunning: !!this.childProcess && !this.childProcess.killed,
      childProcessPid: this.childProcess?.pid,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      isShuttingDown: this.isShuttingDown,
      uptime: process.uptime()
    };
  }
}

module.exports = ProcessManager;
