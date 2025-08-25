# GitHub集成指南

本项目现在支持GitHub集成，可以为GitHub Pull Request提供AI代码审查功能。

## 🚀 功能特性

### 1. 自动代码审查
- **PR事件触发**: 当创建、更新或重新打开Pull Request时自动触发
- **智能分析**: 使用多模型AI分析代码变更
- **行内评论**: 在具体代码行添加审查建议
- **总体评论**: 提供审查摘要和统计信息

### 2. 支持的事件类型
- `pull_request`: PR创建、更新、重新打开
- `pull_request_review_comment`: PR评论事件
- `push`: 代码推送事件

### 3. 多平台支持
- **GitLab**: 原有的Merge Request支持
- **GitHub**: 新增的Pull Request支持
- **统一接口**: 两个平台使用相同的AI审查逻辑

## ⚙️ 配置说明

### 1. 环境变量配置

在 `.env` 文件中添加以下GitHub配置：

```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_API_URL=https://api.github.com
GITHUB_TIMEOUT=10000
GITHUB_MAX_RETRIES=3
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
```

### 2. GitHub Token获取

1. 访问 [GitHub Settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择以下权限：
   - `repo` - 完整的仓库访问权限
   - `read:org` - 读取组织信息（如果需要）
4. 生成并复制Token

### 3. Webhook配置

在GitHub仓库中配置Webhook：

1. 进入仓库 → Settings → Webhooks
2. 点击 "Add webhook"
3. 配置以下信息：
   - **Payload URL**: `http://your-server:3001/api/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: 设置一个安全的密钥（与`GITHUB_WEBHOOK_SECRET`保持一致）
   - **Events**: 选择以下事件：
     - ✅ `Pull requests`
     - ✅ `Pushes`
     - ✅ `Issue comments`（可选）

## 🔧 API接口

### 1. Webhook接口

#### GitHub Webhook接收
```bash
POST /api/github/webhook
```

**触发条件**:
- 创建Pull Request
- 更新Pull Request
- 重新打开Pull Request

**处理流程**:
1. 接收GitHub Webhook事件
2. 获取PR的变更文件
3. 调用AI进行代码审查
4. 添加行内评论和总体评论

### 2. 手动触发接口

#### 手动触发PR审查
```bash
POST /api/github/review/:owner/:repo/:prNumber
```

**参数说明**:
- `owner`: 仓库所有者用户名
- `repo`: 仓库名称
- `prNumber`: Pull Request编号

**使用示例**:
```bash
curl -X POST http://localhost:3001/api/github/review/username/repo-name/123
```

### 3. 测试和状态接口

#### 测试GitHub连接
```bash
GET /api/github/test
```

#### 获取仓库信息
```bash
GET /api/github/repo/:owner/:repo
```

#### 获取仓库权限
```bash
GET /api/github/repo/:owner/:repo
```

## 📊 使用示例

### 1. 自动审查流程

1. **创建Pull Request**
   ```bash
   # 在GitHub上创建PR
   git push origin feature-branch
   # 在GitHub界面创建PR
   ```

2. **自动触发审查**
   - GitHub发送Webhook到你的服务器
   - 服务器自动分析代码变更
   - AI生成审查建议

3. **查看审查结果**
   - 行内评论：在具体代码行查看建议
   - 总体评论：查看审查摘要和统计

### 2. 手动触发审查

```bash
# 对特定PR进行审查
curl -X POST http://localhost:3001/api/github/review/username/repo-name/123 \
  -H "Content-Type: application/json"
```

### 3. 测试连接

```bash
# 测试GitHub API连接
curl http://localhost:3001/api/github/test
```

## 🏗️ 架构设计

### 1. 核心组件

- **GitHubAPI**: GitHub API交互服务
- **GitHubRoutes**: GitHub Webhook和API路由
- **UnifiedCodeReviewer**: 统一代码审查服务
- **MultiModelAICodeReviewer**: 多模型AI审查器

### 2. 数据流

```
GitHub Webhook → GitHub Routes → GitHub API → 
Unified Code Reviewer → Multi-Model AI → 
Review Results → GitHub Comments
```

### 3. 平台抽象

- **统一接口**: GitLab和GitHub使用相同的审查逻辑
- **平台适配**: 根据平台调整评论格式和API调用
- **错误处理**: 统一的错误处理和日志记录

## 🔍 故障排除

### 1. 常见问题

#### Webhook未触发
- 检查Webhook URL是否正确
- 确认服务器是否可访问
- 查看GitHub Webhook日志

#### API调用失败
- 验证GitHub Token是否有效
- 检查Token权限是否足够
- 确认API速率限制

#### 评论添加失败
- 检查PR状态（必须是open状态）
- 确认文件路径和行号正确
- 查看API错误响应

### 2. 日志查看

```bash
# 查看服务日志
npm run dev

# 查看GitHub相关日志
grep "GitHub" logs/app.log
```

### 3. 调试模式

设置环境变量启用调试日志：
```bash
LOG_LEVEL=debug
ENABLE_DEBUG_LOGS=true
```

## 📈 性能优化

### 1. 并发控制
- 限制同时处理的PR数量
- 控制GitHub API调用频率
- 优化评论添加策略

### 2. 缓存机制
- 审查结果缓存
- 文件内容缓存
- 用户权限缓存

### 3. 降级策略
- API失败时自动重试
- 网络问题时降级处理
- 部分失败时继续处理

## 🔐 安全考虑

### 1. Webhook安全
- 启用Webhook签名验证
- 使用HTTPS传输
- 限制Webhook来源

### 2. Token管理
- 使用最小权限原则
- 定期轮换Token
- 监控Token使用情况

### 3. 访问控制
- 限制API访问来源
- 验证仓库权限
- 记录所有操作日志

## 🚀 部署指南

### 1. 服务器要求
- Node.js 20+
- 公网IP或域名
- HTTPS支持（推荐）

### 2. 环境配置
```bash
# 复制环境变量模板
cp env.example .env

# 编辑配置文件
vim .env

# 安装依赖
npm install

# 启动服务
npm start
```

### 3. 反向代理配置

#### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 更新日志

### v2.0.0
- ✅ 新增GitHub集成支持
- ✅ 支持Pull Request自动审查
- ✅ 统一GitLab和GitHub接口
- ✅ 多模型AI支持
- ✅ 性能优化和错误处理

### v1.0.0
- ✅ GitLab集成
- ✅ 基础代码审查功能

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进GitHub集成功能！

## 📄 许可证

MIT License
