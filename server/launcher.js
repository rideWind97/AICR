#!/usr/bin/env node

const ProcessManager = require('./processManager');
const Logger = require('./utils/logger');

/**
 * 主启动器 - 使用进程管理器启动和管理服务
 */
class Launcher {
  constructor() {
    this.processManager = new ProcessManager();
    this.startTime = Date.now();
  }

  /**
   * 启动服务
   */
  start() {
    Logger.info('启动AI CR服务启动器', {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    });

    // 启动进程管理器
    this.processManager.start();

    // 定期输出状态信息
    this.startStatusReporting();

    Logger.info('启动器启动完成，开始监控子进程');
  }

  /**
   * 启动状态报告
   */
  startStatusReporting() {
    setInterval(() => {
      const status = this.processManager.getStatus();
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      
      Logger.info('启动器状态报告', {
        uptime: `${uptime}s`,
        childProcessRunning: status.childProcessRunning,
        childProcessPid: status.childProcessPid,
        restartCount: status.restartCount,
        maxRestarts: status.maxRestarts
      });
    }, 60000); // 每分钟报告一次
  }

  /**
   * 停止服务
   */
  stop() {
    Logger.info('停止启动器');
    this.processManager.stop();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const launcher = new Launcher();
  
  // 启动服务
  launcher.start();

  // 处理进程信号
  process.on('SIGTERM', () => {
    Logger.info('收到SIGTERM信号，停止启动器');
    launcher.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    Logger.info('收到SIGINT信号，停止启动器');
    launcher.stop();
    process.exit(0);
  });
}

module.exports = Launcher;
