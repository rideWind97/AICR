/**
 * 应用类型定义
 */

/**
 * @typedef {Object} Change
 * @property {string} new_path - 新文件路径
 * @property {string} old_path - 旧文件路径
 * @property {string} diff - 差异内容
 * @property {string} base_sha - 基础 SHA
 * @property {string} start_sha - 开始 SHA
 * @property {string} head_sha - 最新 SHA
 */

/**
 * @typedef {Object} LineReview
 * @property {number} lineNumber - 行号
 * @property {string} content - 代码内容
 * @property {string} review - 审查意见
 * @property {number} groupId - 组 ID
 * @property {boolean} isGroupEnd - 是否是组结尾
 * @property {number} groupSize - 组大小
 */

/**
 * @typedef {Object} FileReview
 * @property {string} filePath - 文件路径
 * @property {Array<LineReview>} review - 行级审查数组
 * @property {Change} change - 变更信息
 */

/**
 * @typedef {Object} Comment
 * @property {string} filePath - 文件路径
 * @property {number} line - 行号
 * @property {number} startLine - 开始行号
 * @property {number} endLine - 结束行号
 * @property {string} note - 评论内容
 * @property {string} noteId - 评论 ID
 * @property {string} createdAt - 创建时间
 * @property {boolean} isAIGenerated - 是否是 AI 生成
 */

/**
 * @typedef {Object} GitLabConfig
 * @property {string} url - GitLab URL
 * @property {string} token - 访问令牌
 * @property {number} timeout - 超时时间
 * @property {number} maxRetries - 最大重试次数
 */

/**
 * @typedef {Object} AIConfig
 * @property {string} apiKey - API 密钥
 * @property {string} apiURL - API URL
 * @property {string} model - 模型名称
 * @property {number} maxTokens - 最大令牌数
 * @property {number} temperature - 温度参数
 * @property {number} timeout - 超时时间
 */

/**
 * @typedef {Object} ServerConfig
 * @property {number} port - 端口号
 * @property {string} host - 主机地址
 */

/**
 * @typedef {Object} ReviewConfig
 * @property {number} maxLinesPerBatch - 每批最大行数
 * @property {number} maxFilesConcurrent - 最大并发文件数
 * @property {number} minLinesToReview - 最小审查行数
 * @property {boolean} enableInlineComments - 是否启用行内评论
 * @property {boolean} addSummaryComment - 是否添加总结评论
 */

/**
 * @typedef {Object} AppConfig
 * @property {GitLabConfig} gitlab - GitLab 配置
 * @property {AIConfig} ai - AI 配置
 * @property {ServerConfig} server - 服务器配置
 * @property {ReviewConfig} review - 审查配置
 */

module.exports = {
  // 导出类型定义，供 JSDoc 使用
  Change: {},
  LineReview: {},
  FileReview: {},
  Comment: {},
  GitLabConfig: {},
  AIConfig: {},
  ServerConfig: {},
  ReviewConfig: {},
  AppConfig: {}
};
