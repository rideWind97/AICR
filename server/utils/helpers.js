const { networkInterfaces } = require('os');

/**
 * 获取本机 IPv4 地址
 * @returns {string} 本机 IP 地址
 */
function getLocalIP() {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // 跳过内部地址和非 IPv4 地址
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  
  // 如果没有找到合适的 IP，返回 localhost
  return '127.0.0.1';
}

/**
 * 创建代码审查提示
 * @param {string} diff - 代码变更内容
 * @returns {string} 格式化的提示内容
 */
function createReviewPrompt(diff) {
  return `
请审查以下代码变更（diff 格式）：

\`\`\`diff
${diff}
\`\`\`

请从以下维度分析：
1. 安全性：是否有硬编码密钥、SQL 注入？
2. 可靠性：空指针、异常未处理？
3. 性能：循环查库、大对象创建？
4. 可读性：命名、函数长度？
5. 可维护性：是否有多余注释？有的话需要删除多余注释
5. 是否有多余注释？有的话需要删除多余注释
6. 是否有重复代码？有的话给出重构意见

要求：
- 用中文回复
- 分点列出问题和建议
- 如果无问题，回复：✅ 未发现明显问题
`;
}

module.exports = {
  getLocalIP,
  createReviewPrompt
};
