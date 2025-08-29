const axios = require("axios");
const Logger = require("./server/utils/logger");

// 测试配置
const SERVER_URL = "http://172.30.20.102:3001";
const WEBHOOK_PATH = "/api/gitlab/webhook";

// 模拟 GitLab webhook 数据
const webhookData = {
  a: 2,
  changes: {
    author_id: { current: 796, previous: null },
    created_at: { current: "2025-08-28 17:56:52 +0800", previous: null },
    description: { current: "", previous: null },
    id: { current: 106322, previous: null },
    iid: { current: 5, previous: null },
    merge_params: {
      current: { force_remove_source_branch: "1" },
      previous: {},
    },
    source_branch: { current: "feat_ai_bailian_v1", previous: null },
    source_project_id: { current: 2202, previous: null },
    target_branch: { current: "master", previous: null },
    target_project_id: { current: 2202, previous: null },
    title: { current: "feat: 接入百炼", previous: null },
    total_time_spent: { current: 0, previous: null },
    updated_at: { current: "2025-08-28 17:56:52 +0800", previous: null },
  },
  event_type: "merge_request",
  labels: [],
  object_attributes: {
    action: "open",
    assignee_id: null,
    assignee_ids: [],
    author_id: 796,
    created_at: "2025-08-28 17:56:52 +0800",
    description: "",
    head_pipeline_id: null,
    human_time_estimate: null,
    human_total_time_spent: null,
    id: 106322,
    iid: 5,
    last_commit: {
      author: { email: "shengjunpeng@jzwg.com", name: "shengjunpeng" },
      id: "d81c252882c857dda488514a3464e1133685855a",
      message: "feat: 接入百炼\n",
      timestamp: "2025-08-28T17:00:00+08:00",
      url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr/commit/d81c252882c857dda488514a3464e1133685855a",
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
      description: "AI CR",
      git_http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      homepage: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
      http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
      id: 2202,
      name: "AICR",
      namespace: "盛俊鹏",
      path_with_namespace: "shengjunpeng/aicr",
      ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      visibility_level: 20,
      web_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
    },
    source_branch: "feat_ai_bailian_v1",
    source_project_id: 2202,
    state: "opened",
    target: {
      avatar_url: null,
      ci_config_path: null,
      default_branch: "master",
      description: "AI CR",
      git_http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
      git_ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      homepage: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
      http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
      id: 2202,
      name: "AICR",
      namespace: "盛俊鹏",
      path_with_namespace: "shengjunpeng/aicr",
      ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
      visibility_level: 20,
      web_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
    },
    target_branch: "master",
    target_project_id: 2202,
    time_estimate: 0,
    title: "feat: 接入百炼",
    total_time_spent: 0,
    updated_at: "2025-08-28 17:56:52 +0800",
    updated_by_id: null,
    url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr/merge_requests/5",
    work_in_progress: false,
  },
  object_kind: "merge_request",
  project: {
    avatar_url: null,
    ci_config_path: null,
    default_branch: "master",
    description: "AI CR",
    git_http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
    git_ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
    homepage: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
    http_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr.git",
    id: 2202,
    name: "AICR",
    namespace: "盛俊鹏",
    path_with_namespace: "shengjunpeng/aicr",
    ssh_url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
    url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
    visibility_level: 20,
    web_url: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
  },
  repository: {
    description: "AI CR",
    homepage: "https://gitlab.lanhuapp.com/shengjunpeng/aicr",
    name: "AICR",
    url: "git@gitlab.lanhuapp.com:shengjunpeng/aicr.git",
  },
  user: {
    avatar_url:
      "https://gitlab.lanhuapp.com/uploads/-/system/user/avatar/796/avatar.png",
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
