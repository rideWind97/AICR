/**
 * AI代码审查配置模块
 */

const AI_REVIEW_CONFIG = {
  // API配置
  api: {
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
    requestTimeout: parseInt(process.env.AI_REQUEST_TIMEOUT) || 6000,
    model: process.env.AI_MODEL || "qwen-plus",
  },

  // 性能优化配置
  performance: {
    maxConcurrentFiles: parseInt(process.env.MAX_FILES_CONCURRENT) || 10,
    maxGroupsPerBatch: parseInt(process.env.MAX_GROUPS_PER_BATCH) || 15,
    maxLinesPerGroup: parseInt(process.env.MAX_LINES_PER_GROUP) || 1000,
    maxConcurrentAI: parseInt(process.env.MAX_CONCURRENT_AI) || 10,
  },

  // 缓存配置
  cache: {
    expiry: 24 * 60 * 60 * 1000, // 24小时
    maxSize: 1000,
  },

  // 文件类型过滤规则
  fileTypeRules: {
    ignoredExtensions: [
      ".css", ".scss", ".sass", ".less", ".styl",
      ".md", ".markdown", ".mdx", ".txt", ".rst", ".adoc", ".doc", ".docx", ".pdf",
      ".toml", ".ini", ".conf", ".cfg", ".config",
    ],
    specialHandling: {
      packageFiles: {
        enabled: true,
        patterns: ["package.json", "package-lock.json"],
        action: "skip",
      },
      lockFiles: {
        enabled: true,
        patterns: ["pnpm-lock.yaml", "yarn.lock"],
        action: "syntaxOnly",
      },
      vueFiles: {
        enabled: true,
        patterns: [".vue"],
        action: "skipStyle",
      },
    },
  },

  // 预过滤规则
  skipPatterns: [
    /^\s*\/\/\s*TODO:/i,
    /^\s*\/\/\s*FIXME:/i,
    /^\s*\/\/\s*NOTE:/i,
    /^\s*\/\*.*\*\/\s*$/,
    /^\s*console\.log\s*\(/i,
    /^\s*console\.warn\s*\(/i,
    /^\s*console\.error\s*\(/i,
    /^\s*debugger\s*;?\s*$/,
    /^\s*import\s+.*\s+from\s+['"]/,
    /^\s*export\s+/,
    /^\s*}\s*$/,
    /^\s*{\s*$/,
    /^\s*\)\s*$/,
    /^\s*\(\s*$/,
    /^\s*;\s*$/,
    /^\s*,\s*$/,
    /^\s*\[\s*\]\s*$/,
    /^\s*{\s*}\s*$/,
  ],

  // 代码质量快速检查规则
  quickCheckRules: {
    minLength: 3,
    maxLength: 200,
    hasContent: true,
    notJustWhitespace: true,
  },

  // 低质量审查意见模式
  lowQualityPatterns: [
    "PASS", "pass", "Pass", "无问题", "没问题", "代码正确", "语法正确",
    "命名规范", "逻辑合理", "没有发现", "看起来不错", "代码很好",
    "没有问题", "代码没问题",
  ],

  // 冗长模式
  verbosePatterns: [
    "新增代码逻辑清晰", "结构合理", "符合.*规范", "不存在明显.*问题",
    "使用合理", "整体设计", "简洁有效", "代码质量良好", "实现方式正确",
    "遵循最佳实践", "没有发现.*问题", "代码结构清晰", "逻辑清晰",
    "设计合理", "实现合理", "符合.*标准", "没有.*问题", "代码.*良好",
    "整体.*合理", "结构.*清晰",
  ],

  // 空泛词汇
  emptyWords: [
    "逻辑", "结构", "规范", "问题", "合理", "清晰", "良好", "正确",
    "标准", "实践", "设计", "实现", "方式", "质量", "整体", "简洁",
    "有效", "符合", "遵循", "没有",
  ],
};

module.exports = AI_REVIEW_CONFIG;
