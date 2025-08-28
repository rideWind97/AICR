#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

/**
 * 服务监控脚本
 */
class ServiceMonitor {
  constructor() {
    this.baseURL = process.env.SERVER_URL || 'http://localhost:3001';
    this.healthEndpoint = `${this.baseURL}/api/health`;
    this.tasksEndpoint = `${this.baseURL}/api/tasks`;
  }

  /**
   * 检查服务健康状态
   */
  async checkHealth() {
    try {
      console.log('🔍 检查服务健康状态...');
      
      const response = await axios.get(this.healthEndpoint, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('✅ 服务运行正常');
        console.log('状态:', response.data.status);
        console.log('时间:', response.data.timestamp);
        console.log('服务:', response.data.service);
        console.log('版本:', response.data.version);
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('❌ 服务健康检查失败');
      if (error.response) {
        console.log('状态码:', error.response.status);
        console.log('响应:', error.response.data);
      } else {
        console.log('错误:', error.message);
      }
      return false;
    }
  }

  /**
   * 检查任务状态
   */
  async checkTasks() {
    try {
      console.log('\n📋 检查任务状态...');
      
      const response = await axios.get(this.tasksEndpoint, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        const { total, tasks } = response.data.data;
        console.log(`总任务数: ${total}`);
        
        if (tasks.length > 0) {
          console.log('\n最近的任务:');
          tasks.slice(0, 5).forEach((task, index) => {
            console.log(`${index + 1}. ${task.taskId}`);
            console.log(`   状态: ${task.status}`);
            console.log(`   项目: ${task.projectId}`);
            console.log(`   MR: ${task.mrIid}`);
            console.log(`   开始时间: ${new Date(task.startTime).toLocaleString()}`);
            if (task.duration) {
              console.log(`   耗时: ${task.duration}ms`);
            }
            console.log('');
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.log('❌ 任务状态检查失败');
      if (error.response) {
        console.log('状态码:', error.response.status);
        console.log('响应:', error.response.data);
      } else {
        console.log('错误:', error.message);
      }
      return false;
    }
  }

  /**
   * 重启服务
   */
  async restartService() {
    try {
      console.log('\n🔄 重启服务...');
      
      // 检查是否有PM2
      const hasPM2 = await this.checkPM2();
      
      if (hasPM2) {
        console.log('使用PM2重启服务...');
        await this.restartWithPM2();
      } else {
        console.log('使用进程管理器重启服务...');
        await this.restartWithProcessManager();
      }
      
    } catch (error) {
      console.log('❌ 重启服务失败:', error.message);
    }
  }

  /**
   * 检查是否安装了PM2
   */
  async checkPM2() {
    try {
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('pm2 --version', (error) => {
          resolve(!error);
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * 使用PM2重启服务
   */
  async restartWithPM2() {
    return new Promise((resolve, reject) => {
      const pm2 = spawn('pm2', ['restart', 'ai-code-reviewer'], {
        stdio: 'inherit'
      });
      
      pm2.on('close', (code) => {
        if (code === 0) {
          console.log('✅ PM2重启成功');
          resolve();
        } else {
          reject(new Error(`PM2重启失败，退出码: ${code}`));
        }
      });
      
      pm2.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 使用进程管理器重启服务
   */
  async restartWithProcessManager() {
    return new Promise((resolve, reject) => {
      const launcher = spawn('node', ['server/launcher.js'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      launcher.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 进程管理器重启成功');
          resolve();
        } else {
          reject(new Error(`进程管理器重启失败，退出码: ${code}`));
        }
      });
      
      launcher.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🔧 AI Code Reviewer 服务监控工具

用法:
  node scripts/monitor.js [命令]

命令:
  health    检查服务健康状态
  tasks     检查任务状态
  restart   重启服务
  status    显示完整状态信息
  help      显示此帮助信息

示例:
  node scripts/monitor.js health
  node scripts/monitor.js restart
  node scripts/monitor.js status
    `);
  }

  /**
   * 运行监控
   */
  async run() {
    const command = process.argv[2] || 'status';
    
    switch (command) {
      case 'health':
        await this.checkHealth();
        break;
        
      case 'tasks':
        await this.checkTasks();
        break;
        
      case 'restart':
        await this.restartService();
        break;
        
      case 'status':
        await this.checkHealth();
        await this.checkTasks();
        break;
        
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const monitor = new ServiceMonitor();
  monitor.run().catch(console.error);
}

module.exports = ServiceMonitor;
