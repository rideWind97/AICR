# 服务器目录结构说明

## 📁 目录结构

```
server/
├── index.js                    # 主入口文件
├── config/                     # 配置模块
│   └── index.js               # 配置管理
├── routes/                     # 路由模块
│   └── webhook.js             # Webhook 路由处理
├── services/                   # 业务服务层
│   ├── aiCodeReviewer.js      # AI 代码审查服务
│   ├── aiApiService.js        # AI API 调用服务
│   ├── githubAPI.js           # GitHub API 操作服务
│   ├── gitlabAPI.js           # GitLab API 操作服务
│   ├── config/                # 服务配置
│   │   └── aiReviewConfig.js  # AI 审查配置
│   └── utils/                 # 服务工具类
│       ├── cacheManager.js    # 缓存管理
│       ├── codeProcessor.js   # 代码处理工具
│       ├── commentMatcher.js  # 评论匹配工具
│       ├── errorHandler.js    # 错误处理工具
│       ├── fileFilter.js      # 文件过滤工具
│       └── promptGenerator.js # 提示词生成工具
├── handlers/                   # 事件处理器
│   ├── githubEventHandler.js  # GitHub 事件处理
│   └── gitlabEventHandler.js  # GitLab 事件处理
├── utils/                      # 工具函数
│   ├── helpers.js             # 通用辅助函数
│   └── logger.js              # 日志工具
└── README.md                  # 本说明文件
```

## 🔧 模块说明

### 1. **index.js** - 主入口文件
- Express 应用初始化
- 中间件配置
- 路由注册
- 服务启动

### 2. **config/index.js** - 配置管理
- 环境变量配置
- 服务配置管理
- 配置验证

### 3. **routes/webhook.js** - 路由层
- 健康检查端点
- GitHub/GitLab Webhook 入口
- 请求参数验证
- 错误处理

### 4. **services/** - 业务服务层

#### 4.1 核心服务
- **aiCodeReviewer.js**: AI 代码审查核心服务
- **aiApiService.js**: AI API 调用封装服务

#### 4.2 API 服务
- **githubAPI.js**: GitHub API 操作服务
- **gitlabAPI.js**: GitLab API 操作服务

#### 4.3 配置服务
- **config/aiReviewConfig.js**: AI 审查配置（分组规则、过滤规则等）

#### 4.4 工具服务
- **utils/cacheManager.js**: 缓存管理工具
- **utils/codeProcessor.js**: 代码处理工具（分组、过滤、解析）
- **utils/commentMatcher.js**: 评论匹配工具
- **utils/errorHandler.js**: 错误处理工具
- **utils/fileFilter.js**: 文件过滤工具
- **utils/promptGenerator.js**: 提示词生成工具

### 5. **handlers/** - 事件处理层
- **githubEventHandler.js**: GitHub 事件处理逻辑
- **gitlabEventHandler.js**: GitLab 事件处理逻辑
- 支持 Push 事件和 Merge Request 事件
- 业务流程编排

### 6. **utils/** - 工具函数
- **helpers.js**: 通用辅助函数
- **logger.js**: 结构化日志记录工具

## 🚀 启动方式

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🎯 核心功能

### AI 代码审查流程
1. **代码接收**: 通过 Webhook 接收 GitHub/GitLab 事件
2. **文件过滤**: 根据文件类型和规则过滤需要审查的文件
3. **代码分组**: 使用智能分组算法将代码变更分组
4. **AI 审查**: 调用 AI API 进行代码质量审查
5. **结果处理**: 将审查结果发布到对应的代码平台

### 智能分组策略
- **行号连续性**: 连续行号自动分组
- **语义边界**: 在函数、类、注释块边界智能分组
- **性能优化**: 控制每组最大行数（默认40行）
- **预过滤**: 跳过明显不需要审查的代码

### 支持的平台
- **GitHub**: 支持 Push 和 Pull Request 事件
- **GitLab**: 支持 Push 和 Merge Request 事件

## 📝 扩展说明

- 新增功能时，在对应模块中添加
- 新增路由时，在 `routes/` 目录下创建
- 新增服务时，在 `services/` 目录下创建
- 新增事件类型时，在 `handlers/` 目录下扩展
- 新增工具函数时，在 `utils/` 目录下创建
- 修改分组规则时，更新 `services/config/aiReviewConfig.js`
- 修改提示词时，更新 `services/utils/promptGenerator.js`
