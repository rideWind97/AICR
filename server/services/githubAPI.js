const axios = require('axios');
const Logger = require('../utils/logger');

/**
 * GitHub API服务
 * 提供与GitHub交互的功能，包括获取PR信息、添加评论等
 */
class GitHubAPI {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.apiURL = process.env.GITHUB_API_URL || 'https://api.github.com';
    this.timeout = parseInt(process.env.GITHUB_TIMEOUT) || 10000;
    this.maxRetries = parseInt(process.env.GITHUB_MAX_RETRIES) || 3;
    
    // 验证配置
    this.validateConfig();
  }

  /**
   * 验证GitHub配置
   * @throws {Error} 配置不完整时抛出错误
   */
  validateConfig() {
    if (!this.token) {
      throw new Error('GitHub API令牌不能为空');
    }
  }

  /**
   * 创建GitHub API请求头
   * @returns {Object} 请求头对象
   */
  createHeaders() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Code-Reviewer/2.0.0'
    };
  }

  /**
   * 发送GitHub API请求
   * @param {string} method - HTTP方法
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @returns {Promise<Object>} API响应
   */
  async makeRequest(method, endpoint, data = null) {
    const url = `${this.apiURL}${endpoint}`;
    const headers = this.createHeaders();
    
    const config = {
      method,
      url,
      headers,
      timeout: this.timeout
    };

    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      config.data = data;
    }

    try {
      Logger.info('发送GitHub API请求', {
        method,
        endpoint,
        url
      });

      const response = await axios(config);
      
      Logger.info('GitHub API请求成功', {
        method,
        endpoint,
        status: response.status
      });

      return response.data;
    } catch (error) {
      Logger.error('GitHub API请求失败', error, {
        method,
        endpoint,
        status: error.response?.status,
        message: error.response?.data?.message
      });
      
      this.handleAPIError(error);
    }
  }

  /**
   * 处理GitHub API错误
   * @param {Error} error - 错误对象
   * @throws {Error} 重新抛出格式化的错误
   */
  handleAPIError(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || '未知错误';
      
      switch (status) {
        case 401:
          throw new Error(`GitHub认证失败: ${message}`);
        case 403:
          throw new Error(`GitHub权限不足: ${message}`);
        case 404:
          throw new Error(`GitHub资源不存在: ${message}`);
        case 422:
          throw new Error(`GitHub请求参数错误: ${message}`);
        case 429:
          throw new Error(`GitHub API速率限制: ${message}`);
        default:
          throw new Error(`GitHub API错误 (${status}): ${message}`);
      }
    } else if (error.request) {
      throw new Error('GitHub网络错误: 无法连接到API服务器');
    } else {
      throw new Error(`GitHub请求错误: ${error.message}`);
    }
  }

  /**
   * 获取Pull Request信息
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @returns {Promise<Object>} PR信息
   */
  async getPullRequest(owner, repo, prNumber) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取Pull Request的变更文件
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @returns {Promise<Array>} 变更文件列表
   */
  async getPullRequestFiles(owner, repo, prNumber) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取Pull Request的评论
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @returns {Promise<Array>} 评论列表
   */
  async getPullRequestComments(owner, repo, prNumber) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 添加Pull Request评论
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @param {Object} comment - 评论对象
   * @returns {Promise<Object>} 创建的评论
   */
  async createPullRequestComment(owner, repo, prNumber, comment) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
    return await this.makeRequest('POST', endpoint, comment);
  }

  /**
   * 添加行内评论
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @param {Object} comment - 行内评论对象
   * @returns {Promise<Object>} 创建的行内评论
   */
  async createInlineComment(owner, repo, prNumber, comment) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
    
    // 构建行内评论数据
    const inlineComment = {
      body: comment.body,
      commit_id: comment.commit_id,
      path: comment.path,
      line: comment.line
    };

    // 如果是回复评论，添加回复信息
    if (comment.in_reply_to) {
      inlineComment.in_reply_to = comment.in_reply_to;
    }

    return await this.makeRequest('POST', endpoint, inlineComment);
  }

  /**
   * 添加PR总体评论
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {number} prNumber - PR编号
   * @param {string} body - 评论内容
   * @returns {Promise<Object>} 创建的评论
   */
  async createPRReview(owner, repo, prNumber, body) {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
    
    const reviewData = {
      body: body,
      event: 'COMMENT' // COMMENT, APPROVE, REQUEST_CHANGES
    };

    return await this.makeRequest('POST', endpoint, reviewData);
  }

  /**
   * 获取仓库信息
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @returns {Promise<Object>} 仓库信息
   */
  async getRepository(owner, repo) {
    const endpoint = `/repos/${owner}/${repo}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取仓库分支信息
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {string} branch - 分支名称
   * @returns {Promise<Object>} 分支信息
   */
  async getBranch(owner, repo, branch) {
    const endpoint = `/repos/${owner}/${repo}/branches/${branch}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取文件内容
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {string} path - 文件路径
   * @param {string} ref - 分支或提交引用
   * @returns {Promise<Object>} 文件内容
   */
  async getFileContent(owner, repo, path, ref = 'main') {
    const endpoint = `/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取提交信息
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {string} sha - 提交SHA
   * @returns {Promise<Object>} 提交信息
   */
  async getCommit(owner, repo, sha) {
    const endpoint = `/repos/${owner}/${repo}/commits/${sha}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 获取提交差异
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @param {string} base - 基础提交SHA
   * @param {string} head - 目标提交SHA
   * @returns {Promise<Array>} 差异信息
   */
  async getCommitDiff(owner, repo, base, head) {
    const endpoint = `/repos/${owner}/${repo}/compare/${base}...${head}`;
    return await this.makeRequest('GET', endpoint);
  }

  /**
   * 检查用户权限
   * @param {string} owner - 仓库所有者
   * @param {string} repo - 仓库名称
   * @returns {Promise<Object>} 权限信息
   */
  async checkUserPermission(owner, repo) {
    try {
      const endpoint = `/repos/${owner}/${repo}`;
      const repoInfo = await this.makeRequest('GET', endpoint);
      
      return {
        hasAccess: true,
        permissions: repoInfo.permissions || {},
        isAdmin: repoInfo.permissions?.admin || false,
        canPush: repoInfo.permissions?.push || false,
        canPull: repoInfo.permissions?.pull || false
      };
    } catch (error) {
      return {
        hasAccess: false,
        permissions: {},
        isAdmin: false,
        canPush: false,
        canPull: false,
        error: error.message
      };
    }
  }

  /**
   * 测试API连接
   * @returns {Promise<Object>} 连接测试结果
   */
  async testConnection() {
    try {
      const endpoint = '/user';
      const userInfo = await this.makeRequest('GET', endpoint);
      
      return {
        success: true,
        message: 'GitHub API连接成功',
        user: {
          login: userInfo.login,
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'GitHub API连接失败',
        error: error.message
      };
    }
  }

  /**
   * 解析GitHub Webhook事件
   * @param {Object} payload - Webhook载荷
   * @returns {Object} 解析后的事件信息
   */
  parseWebhookEvent(payload) {
    const event = {
      type: payload.action || 'unknown',
      repository: {
        fullName: payload.repository?.full_name,
        name: payload.repository?.name,
        owner: payload.repository?.owner?.login
      },
      sender: payload.sender?.login,
      timestamp: new Date().toISOString()
    };

    // 根据事件类型解析特定信息
    switch (payload.action) {
      case 'opened':
      case 'synchronize':
      case 'reopened':
        if (payload.pull_request) {
          event.pullRequest = {
            number: payload.pull_request.number,
            title: payload.pull_request.title,
            body: payload.pull_request.body,
            state: payload.pull_request.state,
            head: {
              ref: payload.pull_request.head.ref,
              sha: payload.pull_request.head.sha
            },
            base: {
              ref: payload.pull_request.base.ref,
              sha: payload.pull_request.base.sha
            },
            user: payload.pull_request.user.login,
            htmlUrl: payload.pull_request.html_url
          };
        }
        break;
      
      case 'created':
        if (payload.comment) {
          event.comment = {
            id: payload.comment.id,
            body: payload.comment.body,
            user: payload.comment.user.login,
            path: payload.comment.path,
            line: payload.comment.line,
            commitId: payload.comment.commit_id
          };
        }
        break;
    }

    return event;
  }
}

module.exports = GitHubAPI;
