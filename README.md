# AICR - 多平台AI代码审查器

一个基于多模型AI的智能代码审查工具，支持GitLab和GitHub，能够自动分析代码变更并生成智能审查意见。

## 🎥 演示视频

观看 [demo.mp4](./demo.mp4) 了解 AICR 的实际运行效果。

## 🚀 功能特性

### 🤖 多模型AI支持
- **多种AI模型**: 支持OpenAI、Claude、DeepSeek、Qwen、Gemini等主流AI模型
- **动态切换**: 运行时切换不同的AI模型
- **智能选择**: 根据需求选择最适合的AI模型
- **统一接口**: 所有模型使用相同的审查逻辑

### 🔧 多平台集成
- **GitLab支持**: 完整的Merge Request代码审查
- **GitHub支持**: 全新的Pull Request代码审查
- **统一服务**: 两个平台使用相同的AI审查引擎
- **Webhook集成**: 自动响应代码变更事件

### 📊 智能代码审查
- **智能分析**: 使用AI自动分析代码质量和潜在问题
- **行内评论**: 在具体代码行下添加针对性评论
- **增量审查**: 避免重复评论，只审查新增的代码
- **高性能并发**: 支持多个代码组同时调用AI分析
- **实时返回结果**: 每当AI返回审查结果时立即发送

### 🏗️ 企业级特性
- **性能优化**: 智能缓存、批量处理、降级机制
- **安全可靠**: Webhook签名验证、权限控制、错误处理
- **监控统计**: 完整的操作记录、性能监控、模型统计
- **可扩展性**: 插件化架构，易于添加新平台和AI模型

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitLab       │    │   Webhook      │    │   Unified      │
│   Repository   │───▶│   Server       │───▶│   Code         │
└─────────────────┘    └─────────────────┘    │   Reviewer     │
                                │             └─────────────────┘
                                ▼                       │
                       ┌─────────────────┐              │
                       │   GitHub       │              │
                       │   Repository   │──────────────┘
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Multi-Model  │───▶│   AI Models     │
                       │   AI Service   │    │   (OpenAI,      │
                       └─────────────────┘    │   Claude, etc.) │
                                              └─────────────────┘
```

## 📁 项目结构

```
AICR/
├── demo.mp4                              # 演示视频
├── server/                               # 服务器端代码
│   ├── config/                           # 配置文件
│   │   ├── index.js                      # 主配置
│   │   └── logging.js                    # 日志配置
│   ├── constants/                        # 常量定义
│   │   └── index.js                      # 系统常量
│   ├── handlers/                         # 事件处理器
│   │   └── eventHandler.js               # Webhook 事件处理
│   ├── middleware/                       # 中间件
│   │   └── validation.js                 # 输入验证
│   ├── routes/                           # 路由定义
│   │   ├── webhook.js                    # GitLab Webhook 路由
│   │   ├── github.js                     # GitHub Webhook 路由
│   │   └── models.js                     # AI模型管理路由
│   ├── services/                         # 核心服务
│   │   ├── aiProviders/                  # AI提供者目录
│   │   │   ├── index.js                  # 提供者入口
│   │   │   ├── baseProvider.js           # 基类
│   │   │   ├── openai.js                 # OpenAI提供者
│   │   │   ├── claude.js                 # Claude提供者
│   │   │   ├── deepseek.js               # DeepSeek提供者
│   │   │   ├── qwen.js                   # Qwen提供者
│   │   │   └── gemini.js                 # Gemini提供者
│   │   ├── multiModelAICodeReviewer.js   # 多模型AI审查服务
│   │   ├── unifiedCodeReviewer.js        # 统一代码审查服务
│   │   ├── modelManager.js               # AI模型管理服务
│   │   ├── aiCodeReviewer.js             # 原DeepSeek审查服务
│   │   ├── gitlabAPI.js                  # GitLab API 服务
│   │   ├── githubAPI.js                  # GitHub API 服务
│   │   └── baseService.js                # 基础服务类
│   ├── types/                            # 类型定义
│   │   └── index.js                      # JSDoc 类型
│   ├── utils/                            # 工具函数
│   │   ├── helpers.js                    # 通用工具
│   │   └── logger.js                     # 日志工具
│   └── index.js                          # 服务器入口
├── .env.example                          # 环境变量示例
├── package.json                          # 项目依赖
├── test-webhook.js                       # Webhook 测试脚本
├── MULTI_MODEL_README.md                 # 多模型功能说明
├── GITHUB_INTEGRATION_README.md          # GitHub集成说明
└── README.md                             # 项目说明
```

## 🛠️ 技术栈

- **运行时**: Node.js 20+
- **Web框架**: Express.js
- **AI服务**: 多模型支持（OpenAI、Claude、DeepSeek、Qwen、Gemini）
- **Git集成**: GitLab API v4 + GitHub API v3
- **日志系统**: 自定义结构化日志
- **配置管理**: 环境变量 + 配置文件

## 📋 环境要求

- Node.js >= 20.0.0
- npm 或 pnpm
- GitLab实例（自托管或GitLab.com）或GitHub仓库
- 至少一个AI模型的API密钥

## ⚙️ 安装配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd AICR
```

### 2. 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# AI模型选择
AI_MODEL=deepseek-coder

# 通用AI配置
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.3
AI_REQUEST_TIMEOUT=6000

# GitLab配置
GITLAB_URL=https://gitlab.com
BOT_TOKEN=your_gitlab_bot_token
GITLAB_TIMEOUT=10000
GITLAB_MAX_RETRIES=3

# GitHub配置
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_API_URL=https://api.github.com
GITHUB_TIMEOUT=10000
GITHUB_MAX_RETRIES=3
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1

# Claude配置
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_API_URL=https://api.anthropic.com/v1

# DeepSeek配置（保持向后兼容）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-coder
DEEPSEEK_MAX_TOKENS=2000
DEEPSEEK_TEMPERATURE=0.3
DEEPSEEK_TIMEOUT=30000

# Qwen配置
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1

# Gemini配置
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta

# 服务器配置
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# 审查配置
MAX_LINES_PER_BATCH=50
MAX_FILES_CONCURRENT=3
MIN_LINES_TO_REVIEW=3
ENABLE_INLINE_COMMENTS=true
ADD_SUMMARY_COMMENT=true

# 性能优化配置
MAX_FILES_CONCURRENT=5
MAX_GROUPS_PER_BATCH=15
MAX_LINES_PER_GROUP=40
AI_REQUEST_TIMEOUT=6000
MAX_CONCURRENT_AI=3

# 日志配置
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
```

### 4. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

## 🔧 使用方法

### 1. 配置GitLab Webhook

在GitLab项目中添加Webhook：

- **URL**: `http://your-server:3001/api/gitlab/webhook`
- **触发事件**:
  - `Push events`
  - `Merge request events`
- **SSL验证**: 根据环境选择

### 2. 配置GitHub Webhook

在GitHub仓库中配置Webhook：

- **Payload URL**: `http://your-server:3001/api/github/webhook`
- **Content type**: `application/json`
- **Secret**: 设置安全的密钥
- **Events**: 选择 `Pull requests`、`Pushes`

### 3. 自动代码审查

配置完成后，系统会自动：

1. 监听GitLab的push和merge_request事件
2. 监听GitHub的pull_request和push事件
3. 分析代码变更内容
4. 使用AI生成代码审查意见
5. 在MR/PR的具体代码行下添加评论

### 4. 手动测试

使用提供的测试脚本验证功能：

```bash
# 测试GitLab webhook接口
node test-webhook.js

# 测试GitHub连接
curl http://localhost:3001/api/github/test

# 测试AI模型
curl http://localhost:3001/api/models
```

## 🚀 核心优势

### 多模型AI支持

- **模型多样性**: 支持5种主流AI模型，满足不同需求
- **动态切换**: 运行时切换AI模型，无需重启服务
- **智能推荐**: 根据使用场景推荐最适合的模型
- **统一接口**: 所有模型使用相同的审查逻辑

### 多平台集成

- **GitLab支持**: 完整的Merge Request代码审查
- **GitHub支持**: 全新的Pull Request代码审查
- **统一服务**: 两个平台使用相同的AI审查引擎
- **平台适配**: 自动调整评论格式和API调用

### 高性能并发处理

- **智能分组**: 自动将相关代码行分组，提高审查效率
- **并行处理**: 支持多个代码变更单元并行处理
- **实时返回**: 每当AI分析完成立即返回，无需等待全部完成
- **缓存优化**: 智能缓存审查结果，避免重复AI调用

### 企业级特性

- **性能监控**: 完整的性能统计和监控
- **错误处理**: 智能降级和错误恢复
- **安全可靠**: Webhook签名验证、权限控制
- **可扩展性**: 插件化架构，易于扩展

## 📊 配置说明

### AI模型配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `AI_MODEL` | 默认AI模型 | `deepseek-coder` |
| `AI_MAX_TOKENS` | 最大Token数 | `2000` |
| `AI_TEMPERATURE` | AI创造性 | `0.3` |
| `AI_REQUEST_TIMEOUT` | 请求超时时间 | `6000ms` |

### 平台配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `GITLAB_URL` | GitLab服务器地址 | `https://gitlab.com` |
| `GITHUB_API_URL` | GitHub API地址 | `https://api.github.com` |
| `GITLAB_TIMEOUT` | GitLab API超时 | `10000ms` |
| `GITHUB_TIMEOUT` | GitHub API超时 | `10000ms` |

### 性能配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `MAX_FILES_CONCURRENT` | 并发处理文件数 | `5` |
| `MAX_GROUPS_PER_BATCH` | 每批处理组数 | `15` |
| `MAX_LINES_PER_GROUP` | 每组最大行数 | `40` |
| `MAX_CONCURRENT_AI` | 并发AI请求数 | `3` |

## 🔍 监控和日志

### 健康检查

```bash
curl http://your-server:3001/api/health
```

### AI模型管理

```bash
# 获取支持的模型列表
curl http://localhost:3001/api/models

# 获取当前模型信息
curl http://localhost:3001/api/models/current

# 切换AI模型
curl -X POST http://localhost:3001/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4"}'
```

### 平台状态

```bash
# 测试GitLab连接
curl http://localhost:3001/api/gitlab/test

# 测试GitHub连接
curl http://localhost:3001/api/github/test
```

### 日志级别

- **error**: 错误信息
- **warn**: 警告信息
- **info**: 一般信息
- **debug**: 调试信息

## 🚨 故障排除

### 常见问题

1. **AI模型切换失败**
   - 检查API密钥是否正确
   - 确认API地址是否可访问
   - 查看日志中的错误信息

2. **GitLab/GitHub API调用失败**
   - 验证Token权限
   - 检查网络连接和防火墙
   - 确认API配额是否充足

3. **Webhook接收失败**
   - 确认服务器端口开放
   - 检查Webhook配置
   - 验证签名密钥

4. **AI服务超时**
   - 增加超时时间配置
   - 检查AI API状态
   - 优化并发参数

### 调试模式

启用详细日志：

```bash
LOG_LEVEL=debug ENABLE_DEBUG_LOGS=true npm run dev
```

## 📚 详细文档

- **[多模型功能说明](./MULTI_MODEL_README.md)** - 了解多模型AI支持
- **[GitHub集成指南](./GITHUB_INTEGRATION_README.md)** - GitHub使用说明
- **[环境变量配置](./env.example)** - 完整配置示例

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 支持

如有问题或建议，请：

- 提交 Issue
- 创建 Pull Request
- 联系项目维护者

---

**注意**: 请确保在生产环境中使用前充分测试，并妥善保护API密钥等敏感信息。

**版本**: v2.0.0 - 多平台多模型AI代码审查器
