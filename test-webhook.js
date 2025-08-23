const axios = require('axios');
const Logger = require('./server/utils/logger');

// 测试配置
const SERVER_URL = 'http://192.168.0.153:3001';
const WEBHOOK_PATH = '/api/gitlab/webhook';

// 模拟 GitLab webhook 数据
const webhookData = {
  object_kind: 'merge_request',
  object_attributes: {
    id: 123,
    iid: 14,
    target_branch: 'feat_16_04',
    source_branch: 'feat_16_05',
    action: 'open',
    state: 'opened',
    merge_status: 'unchecked',
    title: 'fix: log',
    description: '修复日志问题',
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z'
  },
  project: {
    id: 2200,
    name: 'mg-ai-code-reviewer',
    description: 'AI-powered code reviewer for GitLab',
    web_url: 'https://gitlab.com/example/mg-ai-code-reviewer',
    git_ssh_url: 'git@gitlab.com:example/mg-ai-code-reviewer.git',
    git_http_url: 'https://gitlab.com/example/mg-ai-code-reviewer.git',
    namespace: 'example',
    visibility_level: 0,
    path_with_namespace: 'example/mg-ai-code-reviewer',
    default_branch: 'main',
    homepage: 'https://gitlab.com/example/mg-ai-code-reviewer',
    url: 'git@gitlab.com:example/mg-ai-code-reviewer.git',
    ssh_url: 'git@gitlab.com:example/mg-ai-code-reviewer.git',
    http_url: 'https://gitlab.com/example/mg-ai-code-reviewer.git'
  },
  project_id: 2200,
  push_options: {},
  ref: "refs/heads/dev",
  repository: {
    name: 'mg-ai-code-reviewer',
    url: 'git@gitlab.com:example/mg-ai-code-reviewer.git',
    description: 'AI-powered code reviewer for GitLab',
    homepage: 'https://gitlab.com/example/mg-ai-code-reviewer'
  },
  user: {
    id: 456,
    name: 'Test User',
    username: 'testuser',
    avatar_url: 'https://gitlab.com/uploads/-/system/user/avatar/456/avatar.png',
    email: 'test@example.com'
  },
  labels: [],
  changes: {
    title: {
      previous: null,
      current: 'fix: log'
    },
    description: {
      previous: null,
      current: '修复日志问题'
    }
  },
  assignees: [],
  assignee: null,
  reviewers: [],
  review_requesters: [],
  total_time_spent: 0,
  human_total_time_spent: null,
  human_time_estimate: null,
  time_estimate: 0,
  updated_by_id: null,
  closed_by_id: null,
  closed_at: null,
  merged_by_id: null,
  merged_at: null,
  merge_commit_sha: null,
  merge_error: null,
  merge_params: {
    force_remove_source_branch: null
  },
  merge_when_pipeline_succeeds: false,
  merge_user_id: null,
  merge_commit_message: null,
  merge_commit_title: null,
  merge_commit_sha: null,
  squash_commit_sha: null,
  squash_commit_message: null,
  squash_commit_title: null,
  squash: false,
  discussion_locked: null,
  should_remove_source_branch: null,
  force_remove_source_branch: null,
  reference: '!14',
  references: {
    short: '!14',
    relative: '!14',
    full: 'example/mg-ai-code-reviewer!14'
  },
  web_url: 'https://gitlab.com/example/mg-ai-code-reviewer/-/merge_requests/14',
  time_stats: {
    time_estimate: 0,
    total_time_spent: 0,
    human_time_estimate: null,
    human_total_time_spent: null
  },
  squash_merge_commit_sha: null,
  task_completion_status: {
    count: 0,
    completed_count: 0
  }
};

/**
 * 测试 GitLab webhook 接口
 */
async function testWebhook() {
  const startTime = Logger.startTimer('Webhook测试');
  
  try {
    Logger.info('开始测试GitLab webhook接口', {
      serverUrl: SERVER_URL,
      webhookPath: WEBHOOK_PATH
    });

    const response = await axios.post(`${SERVER_URL}${WEBHOOK_PATH}`, webhookData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Gitlab-Event': 'Merge Request Hook'
      },
      timeout: 30000
    });

    Logger.endTimer('Webhook测试', startTime, {
      status: response.status,
      success: true
    });

    console.log("✅ 请求成功！");
    console.log("状态码:", response.status);
    console.log("响应数据:", response.data);

  } catch (error) {
    Logger.error('Webhook测试失败', error, {
      serverUrl: SERVER_URL,
      webhookPath: WEBHOOK_PATH
    });

    console.error("❌ 请求失败！");
    
    if (error.response) {
      console.error("状态码:", error.response.status);
      console.error("响应数据:", error.response.data);
    } else {
      console.error("错误信息:", error.message);
    }
  }
}

// 运行测试
testWebhook();
