require("dotenv").config();
const axios = require("axios");
const Logger = require("./server/utils/logger");
const { getLocalIP } = require("./server/utils/helpers");

// 测试配置
const SERVER_URL = `http://${getLocalIP()}:3001`;
const WEBHOOK_PATH = "/api/gitlab/webhook";

// 模拟 GitLab webhook 数据
const webhookData = {
  changes: { total_time_spent: { current: 0, previous: null } },
  event_type: "merge_request",
  labels: [],
  object_attributes: {
    action: "open",
    assignee_id: null,
    assignee_ids: [],
    author_id: 796,
    created_at: "2025-09-08 01:32:19 UTC",
    description: "",
    head_pipeline_id: null,
    human_time_estimate: null,
    human_total_time_spent: null,
    id: 106775,
    iid: 20,
    last_commit: {
      author: { email: "shengjunpeng@jzwg.com", name: "shengjunpeng" },
      id: "6f54677c5dc4a8a8fe10b8fb21dbe3b431016b61",
      message: "fix: 测试\n",
      timestamp: "2025-09-08T09:44:37+08:00",
      url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr/commit/6f54677c5dc4a8a8fe10b8fb21dbe3b431016b61",
    },
    last_edited_at: "2025-09-05 14:32:46 UTC",
    last_edited_by_id: 796,
    merge_commit_sha: null,
    merge_error: null,
    merge_params: { force_remove_source_branch: "1" },
    merge_status: "cannot_be_merged_recheck",
    merge_user_id: null,
    merge_when_pipeline_succeeds: false,
    milestone_id: null,
    oldrev: "880620cac31c46bb5cae42591581235548faa576",
    source: {
      avatar_url: null,
      ci_config_path: null,
      default_branch: "master",
      description: "使用AI来自动CR代码",
      git_http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
      http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      id: 2205,
      name: "ai-code-reviewer",
      namespace: "frontend",
      path_with_namespace: "master/frontend/frontend-ai-cr",
      ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      visibility_level: 0,
      web_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    },
    source_branch: "feat_AI",
    source_project_id: 2205,
    state: "opened",
    target: {
      avatar_url: null,
      ci_config_path: null,
      default_branch: "master",
      description: "使用AI来自动CR代码",
      git_http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
      http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      id: 2205,
      name: "ai-code-reviewer",
      namespace: "frontend",
      path_with_namespace: "master/frontend/frontend-ai-cr",
      ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      visibility_level: 0,
      web_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    },
    target_branch: "master",
    target_project_id: 2205,
    time_estimate: 0,
    title: "Feat ai",
    total_time_spent: 0,
    updated_at: "2025-09-08 01:44:40 UTC",
    updated_by_id: null,
    url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr/merge_requests/20",
    work_in_progress: false,
  },
  object_kind: "merge_request",
  project: {
    avatar_url: null,
    ci_config_path: null,
    default_branch: "master",
    description: "使用AI来自动CR代码",
    git_http_url:
      "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
    git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    http_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
    id: 2205,
    name: "ai-code-reviewer",
    namespace: "frontend",
    path_with_namespace: "master/frontend/frontend-ai-cr",
    ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    visibility_level: 0,
    web_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
  },
  repository: {
    description: "使用AI来自动CR代码",
    homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    name: "ai-code-reviewer",
    url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
  },
  user: {
    avatar_url:
      "https://secure.gravatar.com/avatar/390cb2135863b218f06715c71757f485?s=80\u0026d=identicon",
    name: "盛俊鹏",
    username: "shengjunpeng",
  },
};

/**
 * 测试 GitLab webhook 接口
 */
async function testWebhook() {
  const startTime = Logger.startTimer("Webhook测试");

  try {
    Logger.info("开始测试GitLab webhook接口", {
      serverUrl: SERVER_URL,
      webhookPath: WEBHOOK_PATH,
    });

    const response = await axios.post(
      `${SERVER_URL}${WEBHOOK_PATH}`,
      webhookData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Gitlab-Event": "Merge Request Hook",
        },
        timeout: 3000000,
      }
    );

    Logger.endTimer("Webhook测试", startTime, {
      status: response.status,
      success: true,
    });

    console.log("✅ 请求成功！");
    console.log("状态码:", response.status);
    console.log("响应数据:", response.data);
  } catch (error) {
    Logger.error("Webhook测试失败", error, {
      serverUrl: SERVER_URL,
      webhookPath: WEBHOOK_PATH,
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
