# AICR - AI Code Reviewer

一个基于 AI 的 GitLab 代码审查工具，能够自动分析代码变更并生成智能审查意见。

## 🎥 演示视频

观看 [demo.mp4](./20250824-155251.mp4) 了解 AICR 的实际运行效果。

## 🚀 功能特性

- **智能代码审查**：使用 DeepSeek AI 自动分析代码质量和潜在问题
- **行内评论**：在 GitLab MR 的具体代码行下添加针对性评论
- **增量审查**：避免重复评论，只审查新增的代码
- **高性能并发**：支持 n 个代码组同时调用 n 次 AI 分析
- **实时返回结果**：每当 AI 返回审查结果时立即发送给 GitLab
- **Webhook 集成**：自动响应 GitLab 的 push 和 merge_request 事件
- **结构化日志**：完整的操作记录和性能监控

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitLab       │    │   Webhook      │    │   AI Service    │
│   Repository   │───▶│   Server       │───▶│   DeepSeek     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Event        │
                       │   Handler      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   GitLab API   │
                       │   Service      │
                       └─────────────────┘
```

## 📁 项目结构

```
AICR/
├── demo.mp4              # 演示视频
├── server/                          # 服务器端代码
│   ├── config/                      # 配置文件
│   │   ├── index.js                # 主配置
│   │   └── logging.js              # 日志配置
│   ├── constants/                   # 常量定义
│   │   └── index.js                # 系统常量
│   ├── handlers/                    # 事件处理器
│   │   └── eventHandler.js         # Webhook 事件处理
│   ├── middleware/                  # 中间件
│   │   └── validation.js           # 输入验证
│   ├── routes/                      # 路由定义
│   │   └── webhook.js              # Webhook 路由
│   ├── services/                    # 核心服务
│   │   ├── aiCodeReviewer.js       # AI 代码审查服务
│   │   ├── gitlabAPI.js            # GitLab API 服务
│   │   └── baseService.js          # 基础服务类
│   ├── types/                       # 类型定义
│   │   └── index.js                # JSDoc 类型
│   ├── utils/                       # 工具函数
│   │   ├── helpers.js              # 通用工具
│   │   └── logger.js               # 日志工具
│   └── index.js                    # 服务器入口
├── .env.example                     # 环境变量示例
├── package.json                     # 项目依赖
├── test-webhook.js                  # Webhook 测试脚本
└── README.md                        # 项目说明
```

## 🛠️ 技术栈

- **运行时**：Node.js 20+
- **Web 框架**：Express.js
- **AI 服务**：DeepSeek API
- **Git 集成**：GitLab API v4
- **日志系统**：自定义结构化日志
- **配置管理**：环境变量 + 配置文件

## 📋 环境要求

- Node.js >= 20.0.0
- npm 或 pnpm
- GitLab 实例（自托管或 GitLab.com）
- DeepSeek API 密钥

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
# GitLab 配置
GITLAB_URL=https://gitlab.com
BOT_TOKEN=your_gitlab_bot_token
GITLAB_TIMEOUT=10000
GITLAB_MAX_RETRIES=3

# DeepSeek AI 配置
AI_API_KEY=your_AI_API_KEY
AI_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-plus
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.3
AI_TIMEOUT=30000

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

### 1. 配置 GitLab Webhook

在 GitLab 项目中添加 Webhook：

- **URL**: `http://your-server:3001/api/gitlab/webhook`
- **触发事件**:
  - `Push events`
  - `Merge request events`
- **SSL 验证**: 根据环境选择

### 2. 自动代码审查

配置完成后，系统会自动：

1. 监听 GitLab 的 push 和 merge_request 事件
2. 分析代码变更内容
3. 使用 AI 生成代码审查意见
4. 在 MR 的具体代码行下添加评论

### 3. 手动测试

使用提供的测试脚本验证功能：

```bash
# 测试 webhook 接口
node test-webhook.js
```

## 🚀 核心优势

### 高性能并发处理

- **n 个代码组同时分析**：支持多个代码变更单元并行处理
- **实时返回结果**：每当 AI 分析完成立即返回，无需等待全部完成
- **智能分组策略**：自动将相关代码行分组，提高审查效率

### 智能审查算法

- **预过滤机制**：快速过滤明显不需要审查的代码
- **增量审查**：避免重复评论，只关注新增代码
- **上下文感知**：分析整个代码段的逻辑，而非单行代码

### 缓存和优化

- **智能缓存**：缓存审查结果，避免重复 AI 调用
- **批量处理**：优化 API 调用，减少网络开销
- **降级机制**：当批量处理失败时自动降级为单个处理

## 📊 配置说明

### 审查配置


| 配置项                   | 说明               | 默认值 |
| ------------------------ | ------------------ | ------ |
| `MAX_LINES_PER_BATCH`    | 每批处理的最大行数 | 50     |
| `MAX_FILES_CONCURRENT`   | 并发处理的文件数   | 3      |
| `MIN_LINES_TO_REVIEW`    | 最小审查行数       | 3      |
| `ENABLE_INLINE_COMMENTS` | 启用行内评论       | true   |
| `ADD_SUMMARY_COMMENT`    | 添加总结评论       | true   |

### 性能配置


| 配置项               | 说明                | 默认值  |
| -------------------- | ------------------- | ------- |
| `GITLAB_TIMEOUT`     | GitLab API 超时时间 | 10000ms |
| `GITLAB_MAX_RETRIES` | GitLab API 重试次数 | 3       |
| `AI_TIMEOUT`   | AI API 超时时间     | 30000ms |

### 日志配置


| 配置项              | 说明         | 默认值 |
| ------------------- | ------------ | ------ |
| `LOG_LEVEL`         | 日志级别     | info   |
| `ENABLE_DEBUG_LOGS` | 启用调试日志 | false  |

## 🔍 监控和日志

### 健康检查

```bash
curl http://your-server:3001/api/health
```

### 日志级别

- **error**: 错误信息
- **warn**: 警告信息
- **info**: 一般信息
- **debug**: 调试信息

### 性能监控

系统自动记录关键操作的耗时：

- Webhook 处理时间
- AI 代码审查时间
- GitLab API 调用时间
- 事件处理总时间

## 🚨 故障排除

### 常见问题

1. **环境变量未加载**

   - 检查 `.env` 文件是否存在
   - 确认文件路径正确
2. **GitLab API 调用失败**

   - 验证 `BOT_TOKEN` 权限
   - 检查网络连接和防火墙
3. **AI 服务超时**

   - 增加 `AI_TIMEOUT` 值
   - 检查 DeepSeek API 状态
4. **Webhook 接收失败**

   - 确认服务器端口开放
   - 检查 GitLab Webhook 配置

### 调试模式

启用详细日志：

```bash
LOG_LEVEL=debug ENABLE_DEBUG_LOGS=true npm run dev
```

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

**注意**: 请确保在生产环境中使用前充分测试，并妥善保护 API 密钥等敏感信息。
