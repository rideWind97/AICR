const axios = require("axios");
const Logger = require("./server/utils/logger");
const { getLocalIP } = require("./server/utils/helpers");

// 测试配置
const SERVER_URL = `http://${getLocalIP()}:3001`;
const WEBHOOK_PATH = "/api/gitlab/webhook";

// 模拟 GitLab webhook 数据
const webhookData = {
  changes: {
    author_id: { current: 796, previous: null },
    created_at: { current: "2025-09-03 21:04:00 +0800", previous: null },
    description: { current: "", previous: null },
    id: { current: 106631, previous: null },
    iid: { current: 14, previous: null },
    merge_params: {
      current: { force_remove_source_branch: "1" },
      previous: {},
    },
    source_branch: { current: "fix_v1", previous: null },
    source_project_id: { current: 2205, previous: null },
    target_branch: { current: "master", previous: null },
    target_project_id: { current: 2205, previous: null },
    title: { current: "fix: 测试", previous: null },
    total_time_spent: { current: 0, previous: null },
    updated_at: { current: "2025-09-03 21:04:00 +0800", previous: null },
  },
  event_type: "merge_request",
  labels: [],
  object_attributes: {
    action: "open",
    assignee_id: null,
    assignee_ids: [],
    author_id: 796,
    created_at: "2025-09-03 21:04:00 +0800",
    description: "",
    head_pipeline_id: null,
    human_time_estimate: null,
    human_total_time_spent: null,
    id: 106631,
    iid: 14,
    last_commit: {
      author: { email: "shengjunpeng@jzwg.com", name: "shengjunpeng" },
      id: "44736537686e2f2048e69e285255e3537db91889",
      message: "fix: 测试\n",
      timestamp: "2025-09-03T21:03:38+08:00",
      url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr/commit/44736537686e2f2048e69e285255e3537db91889",
    },
    last_edited_at: null,
    last_edited_by_id: null,
    merge_commit_sha: null,
    merge_error: null,
    merge_params: { force_remove_source_branch: "1" },
    merge_status: "unchecked",
    merge_user_id: null,
    merge_when_pipeline_succeeds: false,
    milestone_id: null,
    source: {
      avatar_url: null,
      ci_config_path: null,
      default_branch: "master",
      description: "",
      git_http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
      http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      id: 2205,
      name: "frontend-ai-cr",
      namespace: "frontend",
      path_with_namespace: "master/frontend/frontend-ai-cr",
      ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      visibility_level: 0,
      web_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    },
    source_branch: "fix_v1",
    source_project_id: 2205,
    state: "opened",
    target: {
      avatar_url: null,
      ci_config_path: null,
      default_branch: "master",
      description: "",
      git_http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
      homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
      http_url:
        "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
      id: 2205,
      name: "frontend-ai-cr",
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
    title: "fix: 测试",
    total_time_spent: 0,
    updated_at: "2025-09-03 21:04:00 +0800",
    updated_by_id: null,
    url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr/merge_requests/14",
    work_in_progress: false,
  },
  object_kind: "merge_request",
  project: {
    avatar_url: null,
    ci_config_path: null,
    default_branch: "master",
    description: "",
    git_http_url:
      "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
    git_ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    http_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr.git",
    id: 2205,
    name: "frontend-ai-cr",
    namespace: "frontend",
    path_with_namespace: "master/frontend/frontend-ai-cr",
    ssh_url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    url: "git@gitlab.lanhuapp.com:master/frontend/frontend-ai-cr.git",
    visibility_level: 0,
    web_url: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
  },
  repository: {
    description: "",
    homepage: "https://gitlab.lanhuapp.com/master/frontend/frontend-ai-cr",
    name: "frontend-ai-cr",
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
