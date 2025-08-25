const express = require('express');
const router = express.Router();
const GitHubAPI = require('../services/githubAPI');
const MultiModelAICodeReviewer = require('../services/multiModelAICodeReviewer');
const Logger = require('../utils/logger');

// 初始化服务
const githubAPI = new GitHubAPI();
const aiReviewer = new MultiModelAICodeReviewer();

/**
 * GitHub Webhook处理
 * POST /api/github/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body;

    Logger.info('收到GitHub Webhook事件', {
      event,
      signature: signature ? '已签名' : '未签名',
      payloadType: typeof payload
    });

    // 验证Webhook签名（可选）
    if (process.env.GITHUB_WEBHOOK_SECRET && signature) {
      // 这里可以添加签名验证逻辑
      Logger.info('GitHub Webhook签名验证已启用');
    }

    // 处理不同类型的事件
    switch (event) {
      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;
      
      case 'pull_request_review_comment':
        await handleReviewCommentEvent(payload);
        break;
      
      case 'push':
        await handlePushEvent(payload);
        break;
      
      default:
        Logger.info('未处理的GitHub事件类型', { event });
    }

    res.status(200).json({
      success: true,
      message: 'GitHub Webhook处理成功',
      event: event
    });

  } catch (error) {
    Logger.error('GitHub Webhook处理失败', error);
    res.status(500).json({
      success: false,
      error: 'Webhook处理失败',
      message: error.message
    });
  }
});

/**
 * 处理Pull Request事件
 * @param {Object} payload - Webhook载荷
 */
async function handlePullRequestEvent(payload) {
  try {
    const { action, pull_request, repository } = payload;
    
    Logger.info('处理GitHub Pull Request事件', {
      action,
      prNumber: pull_request.number,
      repository: repository.full_name
    });

    // 只处理PR打开、同步和重新打开事件
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      Logger.info('跳过非相关PR事件', { action });
      return;
    }

    const owner = repository.owner.login;
    const repo = repository.name;
    const prNumber = pull_request.number;

    // 获取PR的变更文件
    const files = await githubAPI.getPullRequestFiles(owner, repo, prNumber);
    
    if (!files || files.length === 0) {
      Logger.info('PR没有变更文件');
      return;
    }

    // 获取现有评论
    const existingComments = await githubAPI.getPullRequestComments(owner, repo, prNumber);

    // 转换文件格式为AI审查器需要的格式
    const changes = files.map(file => ({
      new_path: file.filename,
      old_path: file.previous_filename || file.filename,
      diff: file.patch || '',
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    }));

    // 生成AI代码审查
    const reviews = await aiReviewer.generateCodeReview(changes, existingComments);

    if (reviews && reviews.length > 0) {
      // 添加AI审查评论
      await addAIReviewComments(owner, repo, prNumber, reviews, pull_request.head.sha);
      
      Logger.info('GitHub PR AI审查完成', {
        prNumber,
        reviewCount: reviews.length
      });
    } else {
      Logger.info('GitHub PR无需AI审查');
    }

  } catch (error) {
    Logger.error('处理GitHub PR事件失败', error);
  }
}

/**
 * 处理PR评论事件
 * @param {Object} payload - Webhook载荷
 */
async function handleReviewCommentEvent(payload) {
  try {
    const { action, comment, pull_request, repository } = payload;
    
    Logger.info('处理GitHub PR评论事件', {
      action,
      commentId: comment.id,
      prNumber: pull_request.number
    });

    // 这里可以添加对评论的响应逻辑
    // 例如：当有人评论时，AI可以分析评论内容并给出建议

  } catch (error) {
    Logger.error('处理GitHub PR评论事件失败', error);
  }
}

/**
 * 处理Push事件
 * @param {Object} payload - Webhook载荷
 */
async function handlePushEvent(payload) {
  try {
    const { ref, commits, repository } = payload;
    
    Logger.info('处理GitHub Push事件', {
      ref,
      commitCount: commits.length,
      repository: repository.full_name
    });

    // 这里可以添加对Push事件的处理逻辑
    // 例如：对特定分支的推送进行代码质量检查

  } catch (error) {
    Logger.error('处理GitHub Push事件失败', error);
  }
}

/**
 * 添加AI审查评论到GitHub PR
 * @param {string} owner - 仓库所有者
 * @param {string} repo - 仓库名称
 * @param {number} prNumber - PR编号
 * @param {Array} reviews - 审查结果数组
 * @param {string} commitSha - 提交SHA
 */
async function addAIReviewComments(owner, repo, prNumber, reviews, commitSha) {
  try {
    let addedComments = 0;
    let skippedComments = 0;

    for (const fileReview of reviews) {
      const { filePath, review: lineReviews } = fileReview;

      if (!lineReviews || lineReviews.length === 0) {
        continue;
      }

      // 为每个审查意见添加行内评论
      for (const lineReview of lineReviews) {
        try {
          const comment = {
            body: `🤖 AI代码审查建议：\n\n${lineReview.review}`,
            commit_id: commitSha,
            path: filePath,
            line: lineReview.lineNumber
          };

          await githubAPI.createInlineComment(owner, repo, prNumber, comment);
          addedComments++;

          // 避免API速率限制，添加延迟
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          Logger.error('添加行内评论失败', error, {
            filePath,
            lineNumber: lineReview.lineNumber
          });
          skippedComments++;
        }
      }
    }

    // 添加总体审查评论
    if (addedComments > 0) {
      const summaryComment = `## 🤖 AI代码审查完成

本次审查共发现 **${addedComments}** 个改进建议，已通过行内评论的方式标注。

**审查模型**: ${aiReviewer.currentModel}
**审查时间**: ${new Date().toLocaleString('zh-CN')}

> 💡 请仔细查看每个建议，并根据实际情况决定是否采纳。如有疑问，欢迎讨论！`;

      try {
        await githubAPI.createPRReview(owner, repo, prNumber, summaryComment);
        Logger.info('GitHub PR总体评论添加成功');
      } catch (error) {
        Logger.error('添加GitHub PR总体评论失败', error);
      }
    }

    Logger.info('GitHub PR评论添加完成', {
      addedComments,
      skippedComments
    });

  } catch (error) {
    Logger.error('添加GitHub PR评论失败', error);
  }
}

/**
 * 手动触发PR审查
 * POST /api/github/review/:owner/:repo/:prNumber
 */
router.post('/review/:owner/:repo/:prNumber', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    
    Logger.info('手动触发GitHub PR审查', {
      owner,
      repo,
      prNumber
    });

    // 获取PR信息
    const pullRequest = await githubAPI.getPullRequest(owner, repo, prNumber);
    
    if (!pullRequest) {
      return res.status(404).json({
        success: false,
        error: 'PR不存在'
      });
    }

    // 获取PR的变更文件
    const files = await githubAPI.getPullRequestFiles(owner, repo, prNumber);
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'PR没有变更文件'
      });
    }

    // 获取现有评论
    const existingComments = await githubAPI.getPullRequestComments(owner, repo, prNumber);

    // 转换文件格式
    const changes = files.map(file => ({
      new_path: file.filename,
      old_path: file.previous_filename || file.filename,
      diff: file.patch || '',
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes
    }));

    // 生成AI代码审查
    const reviews = await aiReviewer.generateCodeReview(changes, existingComments);

    if (reviews && reviews.length > 0) {
      // 添加AI审查评论
      await addAIReviewComments(owner, repo, prNumber, reviews, pullRequest.head.sha);
      
      res.json({
        success: true,
        message: 'GitHub PR AI审查完成',
        data: {
          prNumber: parseInt(prNumber),
          reviewCount: reviews.length,
          model: aiReviewer.currentModel
        }
      });
    } else {
      res.json({
        success: true,
        message: 'GitHub PR无需AI审查',
        data: {
          prNumber: parseInt(prNumber),
          reviewCount: 0
        }
      });
    }

  } catch (error) {
    Logger.error('手动触发GitHub PR审查失败', error);
    res.status(500).json({
      success: false,
      error: '审查失败',
      message: error.message
    });
  }
});

/**
 * 测试GitHub连接
 * GET /api/github/test
 */
router.get('/test', async (req, res) => {
  try {
    const result = await githubAPI.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'GitHub连接测试成功',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'GitHub连接测试失败',
        data: result
      });
    }

  } catch (error) {
    Logger.error('GitHub连接测试失败', error);
    res.status(500).json({
      success: false,
      error: '连接测试失败',
      message: error.message
    });
  }
});

/**
 * 获取仓库信息
 * GET /api/github/repo/:owner/:repo
 */
router.get('/repo/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const repoInfo = await githubAPI.getRepository(owner, repo);
    const permissions = await githubAPI.checkUserPermission(owner, repo);
    
    res.json({
      success: true,
      data: {
        repository: repoInfo,
        permissions: permissions
      }
    });

  } catch (error) {
    Logger.error('获取GitHub仓库信息失败', error);
    res.status(500).json({
      success: false,
      error: '获取仓库信息失败',
      message: error.message
    });
  }
});

module.exports = router;
