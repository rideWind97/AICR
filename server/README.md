# 服务器目录结构说明

## 📁 目录结构

```
server/
├── index.js              # 主入口文件
├── routes/               # 路由模块
│   └── webhook.js        # Webhook 路由处理
├── services/             # 业务服务层
│   ├── gitlabAPI.js      # GitLab API 操作服务
│   └── aiCodeReviewer.js # AI 代码审查服务
├── handlers/             # 事件处理器
│   └── eventHandler.js   # Webhook 事件处理逻辑
├── utils/                # 工具函数
│   └── helpers.js        # 通用辅助函数
└── README.md             # 本说明文件
```

## 🔧 模块说明

### 1. **index.js** - 主入口文件
- Express 应用初始化
- 中间件配置
- 路由注册
- 服务启动

### 2. **routes/webhook.js** - 路由层
- 健康检查端点
- GitLab Webhook 入口
- 请求参数验证
- 错误处理

### 3. **services/** - 业务服务层
- **gitlabAPI.js**: 封装所有 GitLab API 调用
- **aiCodeReviewer.js**: 封装 AI 代码审查功能

### 4. **handlers/eventHandler.js** - 事件处理层
- Push 事件处理逻辑
- Merge Request 事件处理逻辑
- 业务流程编排

### 5. **utils/helpers.js** - 工具函数
- 获取本机 IP 地址
- 创建代码审查提示

## 🚀 启动方式

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 📝 扩展说明

- 新增功能时，在对应模块中添加
- 新增路由时，在 `routes/` 目录下创建
- 新增服务时，在 `services/` 目录下创建
- 新增事件类型时，在 `handlers/` 目录下扩展
