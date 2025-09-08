/**
 * 缓存管理工具类
 */
const AI_REVIEW_CONFIG = require('../config/aiReviewConfig');

class CacheManager {
  constructor() {
    this.reviewCache = new Map();
  }

  /**
   * 生成缓存键
   * @param {string} fileName - 文件名
   * @param {Array} groups - 代码组数组
   * @returns {string} 缓存键
   */
  generateCacheKey(fileName, groups) {
    const groupContent = groups
      .map(
        (g) =>
          `${g.startLine}-${g.endLine}:${g.lines
            .map((l) => l.content)
            .join("")}`
      )
      .join("|");
    return `${fileName}:${groupContent}`;
  }

  /**
   * 获取缓存的审查结果
   * @param {string} cacheKey - 缓存键
   * @returns {Array|null} 缓存的审查结果
   */
  getCachedReview(cacheKey) {
    const cached = this.reviewCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < AI_REVIEW_CONFIG.cache.expiry) {
      return cached.reviews;
    }
    this.reviewCache.delete(cacheKey);
    return null;
  }

  /**
   * 缓存审查结果
   * @param {string} cacheKey - 缓存键
   * @param {Array} reviews - 审查结果数组
   */
  cacheReview(cacheKey, reviews) {
    this.reviewCache.set(cacheKey, {
      reviews,
      timestamp: Date.now(),
    });

    if (this.reviewCache.size > AI_REVIEW_CONFIG.cache.maxSize) {
      this.cleanupCache();
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.reviewCache.entries()) {
      if (now - value.timestamp > AI_REVIEW_CONFIG.cache.expiry) {
        this.reviewCache.delete(key);
      }
    }
  }
}

module.exports = CacheManager;
