/**
 * AI代码审查提示词模板
 * 将此文件放在项目根目录，系统会自动检测并使用项目自定义的审查规则
 */

class AICodeReviewPrompt {
  /**
   * 获取项目自定义的代码审查规则
   * @returns {string} 自定义的prompt规则
   */
  static getProjectPrompt() {
    let prompt = `请按照以下规则进行专业代码审查:\n\n`;
    
    // 基本代码质量规则
    prompt += `**一、基本代码质量规则（AI 可自动检测）**\n`;
    
    // 命名规范
    prompt += `1. 命名规范：变量、函数、类名应具有描述性，避免缩写或模糊命名\n`;
    prompt += `2. 遵循项目命名约定（如：camelCase, snake_case, PascalCase）\n`;
    prompt += `3. 布尔变量建议以 is, has, can 开头\n`;
    
    // 函数设计
    prompt += `4. 函数职责单一：一个函数只做一件事，避免超过100行代码\n`;
    prompt += `5. 函数参数建议不超过3个，否则考虑使用对象封装（超过3个参数必须提示）\n`;
    prompt += `6. 避免重复代码（DRY）：识别相似代码块，提示提取为公共函数\n`;
    
    // 代码结构
    prompt += `7. 循环逻辑只需校验是否可能产生死循环问题\n`;
    prompt += `8. 严禁使用魔术数，应定义为常量\n`;
    
    // 注释和文档
    prompt += `9. 注释内容和todo内容需要校验：技术债务和todo需要明确责任人标记（如 @pengyuyan），临时方案需要记录原因\n`;
    
    // 无需校验的规则（根据项目特点调整）
    prompt += `10. 无需校验变量/函数来源和定义，如以use开头的函数、布尔属性传递给子组件等\n`;
    prompt += `11. 无需校验异常处理机制，如函数调用、try-catch、异常处理等基础编程逻辑\n`;
    prompt += `12. 无需校验简单逻辑，如简单函数实现、统计逻辑、错误日志打印等\n`;
    prompt += `13. 参数含义无需校验，如具名变量、注释说明等基础代码问题\n`;
    prompt += `14. 组件属性重复使用无需校验，如 :canUnbindThird 和 @refresh 等属性在多个组件中重复使用无需提示提取\n`;
    prompt += `15. 国际化函数调用无需校验，如嵌套的 i18n.t 调用无需提示拆分为独立变量或封装为辅助函数\n`;
    prompt += `16. 常量定义无需校验，如常量中混用不同类型无需提示统一类型或明确命名\n`;
    prompt += `17. 枚举值使用无需校验，如枚举值直接作为 label 和 value 使用无需提示提取为独立映射函数\n`;
    prompt += `18. URL 拼接逻辑无需校验，如 URL 拼接未做异常处理无需提示添加错误处理逻辑\n\n`;
    
    // 安全相关规则
    prompt += `**二、安全相关规则（AI 可重点扫描）**\n`;
    prompt += `1. 敏感信息：禁止硬编码密码、API Key、密钥等\n`;
    prompt += `2. 输入验证：检查用户输入是否经过适当验证和清理\n`;
    prompt += `3. SQL注入：检查数据库查询是否使用参数化查询\n`;
    prompt += `4. XSS防护：检查输出是否经过适当转义\n\n`;
    
    // 性能相关规则
    prompt += `**三、性能相关规则（AI 可重点扫描）**\n`;
    prompt += `1. 避免在循环中进行重复计算\n`;
    prompt += `2. 检查是否有内存泄漏风险\n`;
    prompt += `3. 异步操作是否正确处理\n`;
    prompt += `4. 大数据量处理是否考虑分页或分批处理\n\n`;
    
    // 项目特定规则（根据项目特点添加）
    prompt += `**四、项目特定规则**\n`;
    prompt += `1. 前端项目：检查组件是否合理拆分，避免组件过于庞大\n`;
    prompt += `2. 后端项目：检查API设计是否RESTful，错误处理是否完善\n`;
    prompt += `3. 数据库：检查查询是否优化，索引是否合理\n`;
    prompt += `4. 测试：检查是否有足够的测试覆盖\n\n`;
    
    // 输出格式
    prompt += `**示例输出格式：**\n`;
    prompt += `🔍 [AI Review] 建议：\n`;
    prompt += `- 函数 \`processUserData\` 长达80行，建议拆分为多个小函数。\n`;
    prompt += `- 变量名 \`res\` 不够清晰，建议改为 \`userDataResponse\`。\n`;
    prompt += `- 检测到重复代码块，建议提取为公共函数。\n`;
    prompt += `- 函数参数过多，建议使用对象封装。\n`;
    prompt += `- 检测到硬编码的API密钥，建议使用环境变量。\n\n`;
    
    prompt += `回复格式：\n1. [具体改进建议或PASS]\n2. [具体改进建议或PASS]\n...\n\n`;
    prompt += `要求：中文，每意见<100字，无问题直接回复PASS，不要生成"无问题"、"代码很好"等无意义的评论`;
    
    return prompt;
  }
  
  /**
   * 获取项目特定的代码审查规则（可选）
   * 可以根据项目类型、技术栈等返回不同的规则
   * @param {string} projectType - 项目类型 (frontend/backend/fullstack)
   * @param {Array} techStack - 技术栈数组
   * @returns {string} 项目特定的prompt规则
   */
  static getProjectSpecificPrompt(projectType = 'fullstack', techStack = []) {
    let prompt = this.getProjectPrompt();
    
    // 根据项目类型添加特定规则
    if (projectType === 'frontend') {
      prompt += `\n**前端特定规则：**\n`;
      prompt += `1. 检查组件是否遵循单一职责原则\n`;
      prompt += `2. 检查状态管理是否合理，避免不必要的重渲染\n`;
      prompt += `3. 检查是否使用了合适的生命周期方法\n`;
      prompt += `4. 检查样式是否与组件逻辑分离\n`;
    } else if (projectType === 'backend') {
      prompt += `\n**后端特定规则：**\n`;
      prompt += `1. 检查API设计是否RESTful\n`;
      prompt += `2. 检查错误处理是否完善\n`;
      prompt += `3. 检查数据库操作是否优化\n`;
      prompt += `4. 检查日志记录是否充分\n`;
    }
    
    // 根据技术栈添加特定规则
    if (techStack.includes('React')) {
      prompt += `\n**React特定规则：**\n`;
      prompt += `1. 检查是否使用了合适的Hook\n`;
      prompt += `2. 检查组件是否过度渲染\n`;
      prompt += `3. 检查props传递是否合理\n`;
    }
    
    if (techStack.includes('Vue')) {
      prompt += `\n**Vue特定规则：**\n`;
      prompt += `1. 检查组件通信是否合理\n`;
      prompt += `2. 检查计算属性和侦听器使用是否恰当\n`;
      prompt += `3. 检查生命周期钩子使用是否合理\n`;
    }
    
    if (techStack.includes('Node.js')) {
      prompt += `\n**Node.js特定规则：**\n`;
      prompt += `1. 检查异步操作是否正确处理\n`;
      prompt += `2. 检查错误处理是否完善\n`;
      prompt += `3. 检查内存使用是否合理\n`;
    }
    
    return prompt;
  }
}

// 导出模块（如果使用CommonJS）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AICodeReviewPrompt;
}

// 导出模块（如果使用ES6模块）
if (typeof exports !== 'undefined') {
  exports.AICodeReviewPrompt = AICodeReviewPrompt;
}
