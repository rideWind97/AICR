/**
 * Webhook 数据验证中间件
 */
const validateWebhook = (req, res, next) => {
  const { object_kind, project, object_attributes } = req.body;
  
  // 检查基本字段
  if (!object_kind || !project || !object_attributes) {
    return res.status(400).json({ 
      error: 'Invalid webhook data',
      message: '缺少必要的 webhook 字段',
      required: ['object_kind', 'project', 'object_attributes']
    });
  }
  
  // 检查项目信息
  if (!project.id) {
    return res.status(400).json({ 
      error: 'Invalid project data',
      message: '缺少项目 ID'
    });
  }
  
  // 检查对象属性
  if (!object_attributes.iid) {
    return res.status(400).json({ 
      error: 'Invalid object attributes',
      message: '缺少对象 IID'
    });
  }
  
  next();
};

/**
 * 环境变量检查中间件
 */
const checkEnvironment = (req, res, next) => {
  const requiredEnvVars = ['GITLAB_URL', 'BOT_TOKEN', 'AI_API_KEY', 'AI_API_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return res.status(500).json({ 
      error: 'Missing environment variables',
      message: '缺少必要的环境变量',
      missing: missingVars
    });
  }
  
  next();
};

module.exports = {
  validateWebhook,
  checkEnvironment
};
