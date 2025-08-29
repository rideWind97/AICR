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

module.exports = {
  getLocalIP
};
