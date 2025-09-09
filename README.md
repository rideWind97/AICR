# AICR - AI Code Reviewer

一个基于 AI 的 GitLab/GitHub 代码审查工具，能够自动分析代码变更并生成智能审查意见。

## 🚀 功能特性

- **智能代码审查**：使用 DeepSeek AI 自动分析代码质量和潜在问题
- **行内评论**：在 GitLab MR/GitHub PR 的具体代码行下添加针对性评论
- **增量审查**：避免重复评论，只审查新增的代码
- **高性能并发**：支持多个代码组同时调用 AI 分析
- **实时返回结果**：每当 AI 返回审查结果时立即发送给平台
- **Webhook 集成**：自动响应 GitLab 和 GitHub 的 push 和 merge_request/pull_request 事件
- **智能文件过滤**：自动跳过样式文件、文档文件、配置文件等不需要审查的文件类型
- **Vue文件优化**：智能识别Vue文件结构，跳过style部分，只审查template和script
- **结构化日志**：完整的操作记录和性能监控

## 🏗️ 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitLab/      │    │   Webhook      │    │   AI Service    │
│   GitHub       │───▶│   Server       │───▶│   DeepSeek     │
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
                       │   GitLab/      │
                       │   GitHub API   │
                       └─────────────────┘
```

## 📁 项目结构

```
frontend-ai-cr/
├── server/                          # 服务器端代码
│   ├── config/                      # 配置模块
│   │   └── index.js                # 配置管理
│   ├── handlers/                    # 事件处理器
│   │   ├── githubEventHandler.js   # GitHub Webhook 事件处理
│   │   └── gitlabEventHandler.js   # GitLab Webhook 事件处理
│   ├── routes/                      # 路由定义
│   │   └── webhook.js              # Webhook 路由
│   ├── services/                    # 核心服务
│   │   ├── aiCodeReviewer.js       # AI 代码审查服务（核心）
│   │   ├── aiApiService.js         # AI API 调用服务
│   │   ├── githubAPI.js            # GitHub API 服务
│   │   ├── gitlabAPI.js            # GitLab API 服务
│   │   ├── config/                 # 服务配置
│   │   │   └── aiReviewConfig.js   # AI 审查配置
│   │   └── utils/                  # 服务工具类
│   │       ├── cacheManager.js     # 缓存管理
│   │       ├── codeProcessor.js    # 代码处理工具
│   │       ├── commentMatcher.js   # 评论匹配工具
│   │       ├── errorHandler.js     # 错误处理工具
│   │       ├── fileFilter.js       # 文件过滤工具
│   │       └── promptGenerator.js  # 提示词生成工具
│   ├── utils/                       # 工具函数
│   │   ├── helpers.js              # 通用工具
│   │   └── logger.js               # 日志工具
│   ├── index.js                    # 服务器入口
│   └── README.md                   # 服务器说明
├── aiCodeReviewPrompt.cjs          # 项目自定义审查规则（重要）
├── .env.example                     # 环境变量示例
├── .gitignore                       # Git忽略文件
├── .gitlab-ci.yml                   # GitLab CI配置
├── Dockerfile                       # Docker配置
├── package.json                     # 项目依赖
├── package-lock.json                # npm锁定文件
├── pnpm-lock.yaml                   # pnpm锁定文件
├── test-webhook.js                  # Webhook 测试脚本
└── README.md                        # 项目说明
```

## 🛠️ 技术栈

- **运行时**：Node.js 20+
- **Web 框架**：Express.js
- **AI 服务**：DeepSeek API
- **Git 集成**：GitLab API v4, GitHub API v3
- **日志系统**：自定义结构化日志
- **配置管理**：环境变量 + 配置文件
- **包管理**：支持 npm 和 pnpm

## 📋 环境要求

- Node.js >= 20.0.0
- npm 或 pnpm
- GitLab 实例（自托管或 GitLab.com）或 GitHub
- DeepSeek API 密钥

## ⚙️ 安装配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd frontend-ai-cr
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

# GitHub 配置
GITHUB_TOKEN=your_github_token
GITHUB_TIMEOUT=10000
GITHUB_MAX_RETRIES=3

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

### 1. 配置项目自定义审查规则

#### 使用 aiCodeReviewPrompt.cjs

系统支持项目级别的自定义审查规则。将 `aiCodeReviewPrompt.cjs` 文件放在项目根目录，系统会自动检测并使用：

```bash
# 将文件复制到你的项目根目录
cp aiCodeReviewPrompt.cjs /path/to/your/project/
```

#### 自定义审查规则

编辑 `aiCodeReviewPrompt.cjs` 文件，修改 `getProjectPrompt()` 方法：

```javascript
static getProjectPrompt() {
  let prompt = `请按照以下规则进行专业代码审查:\n\n`;
  
  // 添加你的自定义规则
  prompt += `**项目特定规则：**\n`;
  prompt += `1. 遵循项目的编码规范\n`;
  prompt += `2. 检查业务逻辑是否正确\n`;
  // ... 更多规则
  
  return prompt;
}
```

#### 支持的规则类型

- **基本代码质量规则**：命名规范、函数设计、代码结构等
- **安全相关规则**：敏感信息、输入验证、SQL注入等
- **性能相关规则**：循环优化、内存泄漏、异步处理等
- **项目特定规则**：根据项目类型和技术栈定制

#### 技术栈特定规则

支持根据技术栈返回不同规则：

```javascript
// 在项目中使用
const prompt = AICodeReviewPrompt.getProjectSpecificPrompt('frontend', ['React', 'Vue']);
```

### 2. 配置 Webhook

#### GitLab Webhook 配置

在 GitLab 项目中添加 Webhook：

- **URL**: `https://your-domain.com/api/gitlab/webhook`
- **触发事件**:
  - `Merge request events`
- **SSL 验证**: 根据环境选择

#### GitHub Webhook 配置

在 GitHub 仓库中添加 Webhook：

- **URL**: `https://your-domain.com/api/github/webhook`
- **触发事件**:
  - `Pull requests`
- **Content type**: `application/json`

### 3. 自动代码审查

配置完成后，系统会自动：

1. 监听 GitLab MR 或 GitHub PR 事件
2. 检测项目根目录的 `aiCodeReviewPrompt.cjs` 文件
3. 使用项目自定义规则进行代码审查
4. 分析代码变更内容
5. 在具体代码行下添加评论

### 4. 手动测试

使用提供的测试脚本验证功能：

```bash
# 先利用飞书机器人获取gitlab mr webhook 信息体，然后替换 test-webhook.js 中 webhookData即可
# 测试 webhook 接口
node test-webhook.js
```

## 🚀 核心优势

### 项目自定义审查规则

- **灵活配置**：支持项目级别的自定义审查规则
- **技术栈适配**：根据项目技术栈自动调整审查重点
- **团队协作**：规则文件可版本控制，团队共享
- **持续优化**：规则可随时更新，无需重启服务

### 高性能并发处理

- **多代码组并行分析**：支持多个代码变更单元并行处理
- **实时返回结果**：每当 AI 分析完成立即返回，无需等待全部完成
- **智能分组策略**：自动将相关代码行分组，提高审查效率

### 智能审查算法

- **预过滤机制**：快速过滤明显不需要审查的代码
- **增量审查**：避免重复评论，只关注新增代码
- **上下文感知**：分析整个代码段的逻辑，而非单行代码
- **智能文件过滤**：自动跳过样式文件、文档文件等

### 文件类型智能处理

- **CSS文件**：完全跳过审查
- **Vue文件**：跳过style部分，只审查template和script
- **文档文件**：跳过.md、.txt等文档文件
- **配置文件**：跳过.yml、.yaml等配置文件
- **Lock文件**：只进行语法校验，不进行深度审查

### 缓存和优化

- **智能缓存**：缓存审查结果，避免重复 AI 调用
- **批量处理**：优化 API 调用，减少网络开销
- **降级机制**：当批量处理失败时自动降级为单个处理

## 📊 配置说明

### 项目自定义规则配置

#### aiCodeReviewPrompt.cjs 配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `getProjectPrompt()` | 基础审查规则 | 命名规范、函数设计等 |
| `getProjectSpecificPrompt()` | 技术栈特定规则 | React、Vue、Node.js 等 |
| 规则类型 | 支持的规则分类 | 质量、安全、性能、项目特定 |

#### 规则配置示例

```javascript
// 基本规则配置
static getProjectPrompt() {
  let prompt = `请按照以下规则进行专业代码审查:\n\n`;
  
  // 基本代码质量规则
  prompt += `**一、基本代码质量规则**\n`;
  prompt += `1. 命名规范：变量、函数、类名应具有描述性\n`;
  prompt += `2. 函数职责单一：一个函数只做一件事\n`;
  // ... 更多规则
  
  return prompt;
}
```

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
| `GITHUB_TIMEOUT`     | GitHub API 超时时间 | 10000ms |
| `GITHUB_MAX_RETRIES` | GitHub API 重试次数 | 3       |
| `AI_TIMEOUT`         | AI API 超时时间     | 30000ms |

### 日志配置


| 配置项              | 说明         | 默认值 |
| ------------------- | ------------ | ------ |
| `LOG_LEVEL`         | 日志级别     | info   |
| `ENABLE_DEBUG_LOGS` | 启用调试日志 | false  |

## 🔍 监控和日志

### 健康检查

```bash
curl https://your-domain.com/api/health
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
- GitLab/GitHub API 调用时间
- 事件处理总时间

## 🚨 故障排除

### 常见问题

1. **环境变量未加载**

   - 检查 `.env` 文件是否存在
   - 确认文件路径正确

2. **GitLab/GitHub API 调用失败**

   - 验证 `BOT_TOKEN`/`GITHUB_TOKEN` 权限
   - 检查网络连接和防火墙

3. **AI 服务超时**

   - 增加 `AI_TIMEOUT` 值
   - 检查 API 状态

4. **Webhook 接收失败**

   - 确认服务器端口开放
   - 检查 Webhook 配置

5. **项目自定义规则未生效**

   - 确认 `aiCodeReviewPrompt.cjs` 文件在项目根目录
   - 检查文件语法是否正确
   - 查看日志中的规则加载信息

6. **审查规则配置错误**

   - 检查 `getProjectPrompt()` 方法返回值格式
   - 确认规则描述清晰明确
   - 测试规则是否按预期工作

### 调试模式

启用详细日志：

```bash
LOG_LEVEL=debug ENABLE_DEBUG_LOGS=true npm run dev
```

## 📝 使用示例

### 项目自定义规则示例

#### 1. 基础规则配置

```javascript
// aiCodeReviewPrompt.cjs
class AICodeReviewPrompt {
  static getProjectPrompt() {
    let prompt = `请按照以下规则进行专业代码审查:\n\n`;
    
    // 项目特定规则
    prompt += `**项目特定规则：**\n`;
    prompt += `1. 所有API调用必须包含错误处理\n`;
    prompt += `2. 组件props必须定义TypeScript类型\n`;
    prompt += `3. 数据库查询必须使用参数化查询\n`;
    prompt += `4. 敏感操作必须记录审计日志\n\n`;
    
    // 业务逻辑规则
    prompt += `**业务逻辑规则：**\n`;
    prompt += `1. 用户权限检查必须在数据访问前进行\n`;
    prompt += `2. 金额计算必须使用BigDecimal避免精度问题\n`;
    prompt += `3. 文件上传必须验证文件类型和大小\n\n`;
    
    return prompt;
  }
}
```

#### 2. 技术栈特定规则

```javascript
// 针对React项目的规则
static getProjectSpecificPrompt(projectType = 'frontend', techStack = []) {
  let prompt = this.getProjectPrompt();
  
  if (techStack.includes('React')) {
    prompt += `\n**React特定规则：**\n`;
    prompt += `1. 使用useCallback优化事件处理函数\n`;
    prompt += `2. 避免在render中创建新对象\n`;
    prompt += `3. 使用useMemo优化计算属性\n`;
    prompt += `4. 组件拆分遵循单一职责原则\n`;
  }
  
  if (techStack.includes('Vue')) {
    prompt += `\n**Vue特定规则：**\n`;
    prompt += `1. 使用v-if和v-show的正确场景\n`;
    prompt += `2. 避免在模板中使用复杂表达式\n`;
    prompt += `3. 合理使用计算属性和侦听器\n`;
  }
  
  return prompt;
}
```

#### 3. 团队协作规则

```javascript
// 团队编码规范
static getProjectPrompt() {
  let prompt = `请按照以下规则进行专业代码审查:\n\n`;
  
  // 团队约定
  prompt += `**团队编码规范：**\n`;
  prompt += `1. 所有函数必须添加JSDoc注释\n`;
  prompt += `2. 变量命名使用camelCase，常量使用UPPER_CASE\n`;
  prompt += `3. 函数长度不超过50行，超过需要拆分\n`;
  prompt += `4. 所有TODO必须标注负责人和预计完成时间\n`;
  prompt += `5. 提交信息必须使用约定格式：type(scope): description\n\n`;
  
  // 代码质量要求
  prompt += `**代码质量要求：**\n`;
  prompt += `1. 圈复杂度不超过10\n`;
  prompt += `2. 函数参数不超过3个\n`;
  prompt += `3. 避免深层嵌套，最多3层\n`;
  prompt += `4. 所有异常必须被捕获和处理\n\n`;
  
  return prompt;
}
```

## 🐳 Docker 部署

项目提供了 Dockerfile 支持容器化部署：

```bash
# 构建镜像
docker build -t ai-code-reviewer .

# 运行容器
docker run -p 3001:3001 --env-file .env ai-code-reviewer
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
