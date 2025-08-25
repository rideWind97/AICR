# 多模型AI代码审查器

本项目现在支持多种AI模型，包括OpenAI、Claude、DeepSeek、Qwen和Gemini等。

## 🚀 支持的AI模型

### 1. OpenAI模型
- **gpt-4**: GPT-4模型，强大的代码理解和生成能力
- **gpt-4-turbo**: GPT-4 Turbo，更快的响应速度
- **gpt-3.5-turbo**: GPT-3.5 Turbo，性价比高的选择

### 2. Claude模型
- **claude-3-sonnet**: Claude 3 Sonnet，优秀的代码分析能力
- **claude-3-haiku**: Claude 3 Haiku，快速响应
- **claude-3-opus**: Claude 3 Opus，最高性能

### 3. DeepSeek模型
- **deepseek-coder**: DeepSeek Coder，专为代码优化
- **deepseek-chat**: DeepSeek Chat，通用对话能力

### 4. Qwen模型
- **qwen-turbo**: Qwen Turbo，阿里云通义千问
- **qwen-plus**: Qwen Plus，增强版本
- **qwen-max**: Qwen Max，最高性能版本

### 5. Gemini模型
- **gemini-pro**: Gemini Pro，Google的AI模型
- **gemini-pro-vision**: Gemini Pro Vision，支持图像理解

## ⚙️ 配置说明

### 环境变量配置

在 `.env` 文件中配置以下变量：

```bash
# AI模型选择
AI_MODEL=deepseek-coder

# 通用AI配置
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.3
AI_REQUEST_TIMEOUT=6000

# OpenAI配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_URL=https://api.openai.com/v1

# Claude配置
CLAUDE_API_KEY=your_claude_api_key
CLAUDE_API_URL=https://api.anthropic.com/v1

# DeepSeek配置（保持向后兼容）
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Qwen配置
QWEN_API_KEY=your_qwen_api_key
QWEN_API_URL=https://dashscope.aliyuncs.com/api/v1

# Gemini配置
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
```

### 模型优先级推荐

1. **deepseek-coder**: 专为代码审查优化，推荐首选
2. **gpt-4**: 强大的通用能力，适合复杂代码分析
3. **claude-3-sonnet**: 优秀的代码理解能力
4. **qwen-turbo**: 性价比高，响应快速
5. **gemini-pro**: Google的AI模型，稳定性好

## 🔧 API接口

### 模型管理接口

#### 获取支持的模型列表
```bash
GET /api/models
```

#### 获取当前模型信息
```bash
GET /api/models/current
```

#### 切换AI模型
```bash
POST /api/models/switch
Content-Type: application/json

{
  "model": "gpt-4"
}
```

#### 获取模型配置
```bash
GET /api/models/configs
```

#### 获取模型统计
```bash
GET /api/models/stats?model=gpt-4
```

#### 检查模型可用性
```bash
GET /api/models/gpt-4/available
```

#### 测试模型连接
```bash
POST /api/models/gpt-4/test
```

#### 重新加载配置
```bash
POST /api/models/reload
```

## 📊 使用示例

### 1. 查看支持的模型

```bash
curl http://localhost:3001/api/models
```

响应示例：
```json
{
  "success": true,
  "data": {
    "supported": ["gpt-4", "gpt-3.5-turbo", "claude-3-sonnet", "deepseek-coder"],
    "available": [
      {
        "model": "deepseek-coder",
        "provider": "DeepSeek",
        "isActive": true
      }
    ],
    "current": {
      "model": "deepseek-coder",
      "provider": "DeepSeekProvider",
      "config": {...},
      "stats": {...}
    }
  }
}
```

### 2. 切换到GPT-4模型

```bash
curl -X POST http://localhost:3001/api/models/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4"}'
```

### 3. 测试模型连接

```bash
curl -X POST http://localhost:3001/api/models/gpt-4/test
```

## 🏗️ 架构设计

### 核心组件

1. **BaseAIProvider**: AI提供者基类，定义通用接口
2. **具体提供者类**: 继承自BaseAIProvider，实现特定AI模型的接口
3. **ModelManager**: 模型管理器，负责模型切换和配置管理
4. **MultiModelAICodeReviewer**: 多模型代码审查服务

### 设计原则

- **插件化架构**: 每个AI模型都是独立的提供者
- **统一接口**: 所有提供者实现相同的接口
- **动态切换**: 支持运行时切换AI模型
- **向后兼容**: 保持原有DeepSeek功能的完整性
- **配置管理**: 集中管理所有模型的配置

### 扩展新模型

要添加新的AI模型，只需：

1. 创建新的提供者类，继承`BaseAIProvider`
2. 在`aiProviders/index.js`中注册新模型
3. 在`ModelManager`中添加配置逻辑
4. 更新环境变量示例

## 🔍 故障排除

### 常见问题

1. **模型切换失败**
   - 检查API密钥是否正确
   - 确认API地址是否可访问
   - 查看日志中的错误信息

2. **API调用失败**
   - 检查网络连接
   - 确认API配额是否充足
   - 验证请求格式是否正确

3. **配置加载失败**
   - 检查环境变量格式
   - 确认配置文件路径
   - 重启服务重新加载配置

### 日志查看

查看服务日志了解详细错误信息：

```bash
# 查看实时日志
npm run dev

# 查看错误日志
tail -f logs/error.log
```

## 📈 性能优化

### 缓存机制

- 审查结果缓存24小时
- 智能预过滤减少不必要的API调用
- 批量处理提高效率

### 并发控制

- 限制文件并发处理数量
- 控制AI API并发请求数
- 优化代码分组策略

### 降级机制

- 批量处理失败时降级为单个处理
- 网络错误时自动重试
- 模型不可用时切换到备用模型

## 🔐 安全考虑

1. **API密钥管理**: 使用环境变量存储敏感信息
2. **请求验证**: 验证所有输入参数
3. **错误处理**: 避免泄露敏感信息
4. **访问控制**: 限制API访问权限

## 📝 更新日志

### v2.0.0
- 新增多模型支持
- 支持OpenAI、Claude、Qwen、Gemini
- 动态模型切换功能
- 模型性能统计
- 统一的配置管理

### v1.0.0
- 基础DeepSeek支持
- 代码审查功能
- GitLab集成

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📄 许可证

MIT License
