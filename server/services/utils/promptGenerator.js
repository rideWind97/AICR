/**
 * 提示词生成工具类
 */
class PromptGenerator {
  /**
   * 创建优化的提示词
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @param {Object} options - 选项对象
   * @param {string} options.projectId - 项目ID（用于获取项目自定义prompt）
   * @param {string} options.ref - 分支或commit SHA
   * @returns {string} 优化的提示词
   */
  static createOptimizedPrompt(fileName, groups, options = {}) {
    let prompt = `🔍 AI代码审查 - 文件: ${fileName}\n\n`;

    groups.forEach((group, index) => {
      const codeContent = group.lines.map((line) => line.content).join("\n");
      prompt += `${index + 1}. 行${group.startLine}-${
        group.endLine
      }:\n${codeContent}\n\n`;
    });

    // 尝试获取项目自定义prompt
    const projectPrompt = this.getProjectPrompt(options.projectId, options.ref);
    if (projectPrompt) {
      prompt += projectPrompt;
    } else {
      // 使用默认prompt
      prompt += this.getDefaultPrompt();
    }

    return prompt;
  }

  /**
   * 获取项目自定义prompt
   * @param {string} projectId - 项目ID
   * @param {string} ref - 分支或commit SHA
   * @returns {string|null} 项目自定义prompt，如果不存在返回null
   */
  static getProjectPrompt(projectId, ref) {
    // 这里需要异步获取，但静态方法不能直接使用async
    // 实际实现会在调用方处理异步逻辑
    return null;
  }

  /**
   * 异步获取项目自定义prompt
   * @param {string} projectId - 项目ID
   * @param {string} ref - 分支或commit SHA
   * @param {Object} gitlabAPI - GitLab API实例
   * @returns {Promise<string|null>} 项目自定义prompt，如果不存在返回null
   */
  static async getProjectPromptAsync(projectId, ref, gitlabAPI) {
    if (!projectId || !gitlabAPI) {
      return null;
    }

    try {
      // 尝试获取项目中的promptGenerator.js文件
      const promptFileContent = await gitlabAPI.getProjectFile(
        projectId, 
        'aiCodeReviewPrompt.cjs', 
        ref
      );

      if (!promptFileContent) {
        console.log(`❌ 项目自定义prompt文件不存在: ${projectId}`);
        return null;
      }

      // 解析项目中的prompt规则
      const projectRules = this.extractPromptRules(promptFileContent);
      if (projectRules) {
        console.log(`✅ 使用项目自定义prompt规则 (项目: ${projectId})`);
        return projectRules;
      }

      return null;
    } catch (err) {
      console.error('获取项目prompt失败:', err.message);
      return null;
    }
  }

  /**
   * 从项目文件中提取prompt规则
   * @param {string} fileContent - 文件内容
   * @returns {string|null} 提取的prompt规则
   */
  static extractPromptRules(fileContent) {
    try {
      // 方法1：查找 getProjectPrompt 方法
      const getProjectPromptMatch = fileContent.match(/static\s+getProjectPrompt\s*\(\s*\)\s*\{[\s\S]*?return\s+prompt;\s*\}/);
      if (getProjectPromptMatch) {
        // 提取方法内容
        const methodContent = getProjectPromptMatch[0];
        
        // 查找 prompt += 模式
        const promptMatches = methodContent.match(/prompt\s*\+=\s*`([^`]+)`/g);
        if (promptMatches && promptMatches.length > 0) {
          // 构建完整的prompt
          let projectPrompt = '';
          promptMatches.forEach((match) => {
            const ruleContent = match.match(/prompt\s*\+=\s*`([^`]+)`/)[1];
            projectPrompt += ruleContent + '\n';
          });
          return projectPrompt;
        }
        
        // 尝试匹配单个模板字符串
        const promptMatch = methodContent.match(/let\s+prompt\s*=\s*`([\s\S]*?)`;/);
        if (promptMatch) {
          return promptMatch[1];
        }
      }

      // 方法2：查找 prompt += 模式（兼容旧格式）
      const promptMatch = fileContent.match(/prompt\s*\+=\s*`([^`]+)`/g);
      if (promptMatch) {
        // 构建prompt规则
        let projectPrompt = `请按照以下规则进行专业代码审查:\n\n`;
        projectPrompt += `**一、基本代码质量规则（AI 可自动检测）**\n`;
        
        // 提取规则内容
        promptMatch.forEach((match, index) => {
          const ruleContent = match.match(/prompt\s*\+=\s*`([^`]+)`/)[1];
          if (ruleContent && !ruleContent.includes('🔍') && !ruleContent.includes('请按照以下规则')) {
            projectPrompt += ruleContent + '\n';
          }
        });

        projectPrompt += `\n**二、安全相关规则（AI 可重点扫描）**\n`;
        projectPrompt += `1. 敏感信息：禁止硬编码密码、API Key、密钥等\n\n`;

        projectPrompt += `**示例输出格式：**\n`;
        projectPrompt += `🔍 [AI Review] 建议：\n`;
        projectPrompt += `- 函数 \`processUserData\` 长达80行，建议拆分为多个小函数。\n`;
        projectPrompt += `- 变量名 \`res\` 不够清晰，建议改为 \`userDataResponse\`。\n`;
        projectPrompt += `- 检测到重复代码块，建议提取为公共函数。\n`;
        projectPrompt += `- 函数参数过多，建议使用对象封装。\n`;

        projectPrompt += `回复格式：\n1. [具体改进建议或PASS]\n2. [具体改进建议或PASS]\n...\n\n`;
        projectPrompt += `要求：中文，每意见<100字，无问题直接回复PASS，不要生成"无问题"、"代码很好"等无意义的评论`;

        return projectPrompt;
      }

      // 方法3：查找 getProjectSpecificPrompt 方法
      const getProjectSpecificPromptMatch = fileContent.match(/static\s+getProjectSpecificPrompt\s*\([^)]*\)\s*\{[\s\S]*?return\s+prompt;\s*\}/);
      if (getProjectSpecificPromptMatch) {
        // 提取方法内容并执行
        const methodContent = getProjectSpecificPromptMatch[0];
        const promptMatch = methodContent.match(/let\s+prompt\s*=\s*`([\s\S]*?)`;/);
        if (promptMatch) {
          return promptMatch[1];
        }
      }

      return null;
    } catch (err) {
      console.error('解析项目prompt规则失败:', err.message);
      return null;
    }
  }

  /**
   * 获取默认prompt规则
   * @returns {string} 默认prompt规则
   */
  static getDefaultPrompt() {
    let prompt = `请按照以下规则进行专业代码审查:\n\n`;
    prompt += `**一、基本代码质量规则（AI 可自动检测）**\n`;
    prompt += `1. 命名规范：变量、函数、类名应具有描述性，避免缩写或模糊命名\n`;
    prompt += `2. 函数职责单一：一个函数只做一件事，避免超过100行代码\n`;
    prompt += `3. 避免重复代码（DRY）：识别相似代码块，提示提取为公共函数\n`;
    prompt += `4. 遵循项目命名约定（如：camelCase, snake_case, PascalCase）\n`;
    prompt += `5. 注释内容和todo内容需要校验：技术债务和todo需要明确责任人标记（如 @pengyuyan），临时方案需要记录原因\n`;
    prompt += `6. 无需校验变量/函数来源和定义，如以use开头的函数、布尔属性传递给子组件等\n`;
    prompt += `7. 无需校验异常处理机制，如函数调用、try-catch、异常处理等基础编程逻辑\n`;
    prompt += `8. 无需校验简单逻辑，如简单函数实现、统计逻辑、错误日志打印等\n`;
    prompt += `9. 布尔变量建议以 is, has, can 开头\n`;
    prompt += `10. 函数参数建议不超过3个，否则考虑使用对象封装（超过3个参数必须提示）\n`;
    prompt += `11. 循环逻辑只需校验是否可能产生死循环问题\n`;
    prompt += `12. 参数含义无需校验，如具名变量、注释说明等基础代码问题\n`;
    prompt += `13. 组件属性重复使用无需校验，如 :canUnbindThird 和 @refresh 等属性在多个组件中重复使用无需提示提取\n`;
    prompt += `14. 国际化函数调用无需校验，如嵌套的 i18n.t 调用无需提示拆分为独立变量或封装为辅助函数\n`;
    prompt += `15. 常量定义无需校验，如常量中混用不同类型无需提示统一类型或明确命名\n`;
    prompt += `16. 枚举值使用无需校验，如枚举值直接作为 label 和 value 使用无需提示提取为独立映射函数\n`;
    prompt += `17. URL 拼接逻辑无需校验，如 URL 拼接未做异常处理无需提示添加错误处理逻辑\n\n`;
    prompt += `18. 严禁使用魔术数\n`;

    prompt += `**二、安全相关规则（AI 可重点扫描）**\n`;
    prompt += `1. 敏感信息：禁止硬编码密码、API Key、密钥等\n\n`;

    prompt += `**示例输出格式：**\n`;
    prompt += `🔍 [AI Review] 建议：\n`;
    prompt += `- 函数 \`processUserData\` 长达80行，建议拆分为多个小函数。\n`;
    prompt += `- 变量名 \`res\` 不够清晰，建议改为 \`userDataResponse\`。\n`;
    prompt += `- 检测到重复代码块，建议提取为公共函数。\n`;
    prompt += `- 函数参数过多，建议使用对象封装。\n`;

    prompt += `回复格式：\n1. [具体改进建议或PASS]\n2. [具体改进建议或PASS]\n...\n\n`;
    prompt += `要求：中文，每意见<100字，无问题直接回复PASS，不要生成"无问题"、"代码很好"等无意义的评论`;

    return prompt;
  }

}

module.exports = PromptGenerator;
