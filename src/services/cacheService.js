const { redis } = require("../configs/redis");

class CacheService {
  // get
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Cache GET error:", err);
      return null;
    }
  }

  // set
  async set(key, value, expirySeconds = 3600) {
    try {
      await redis.setex(key, expirySeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error("Cache SET error:", err);
      return false;
    }
  }

  // delete
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (err) {
      console.error("Cache DEL error:", err);
      return false;
    }
  }

  // delete Pattern
  async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (err) {
      console.error("Cache DEL pattern error:", err);
      return false;
    }
  }

  // Product caching
  async cacheProduct(productId, productData) {
    return await this.set(`product:${productId}`, productData, 3600);
  }

  async getCachedProduct(productId) {
    return await this.get(`product:${productId}`);
  }

  async invalidateProduct(productId) {
    await this.del(`product:${productId}`);
    await this.delPattern(`products:*`);
  }

  async cacheProductList(key, products, expirySeconds = 600) {
    return await this.set(`products:${key}`, products, expirySeconds);
  }

  async getCachedProductList(key) {
    return await this.get(`products:${key}`);
  }

  async cacheTrendingProducts(products) {
    return await this.set(`trending:products`, products, 300);
  }

  async getCachedTrendingProducts() {
    return await this.get("trending:products");
  }

  async cacheFlashSaleProducts(products) {
    return await this.set(`flash:products`, products, 60);
  }

  async getCachedFlashSaleProducts() {
    return await this.get(`flash:products`);
  }

  // User session tracking
  async trackUserSession(userId, sessionData) {
    const key = `session:${userId}`;
    await redis.hset(key, sessionData);
    await redis.expire(key, 7 * 24 * 3600);
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return await redis.hgetall(key);
  }

  async storeOTP(email, otp, expirySeconds = 600) {
    const key = `otp:${email}`;
    await redis.setex(key, expirySeconds, otp);
  }

  async getOTP(email) {
    const key = `otp:${email}`;
    return await redis.get(key);
  }

  async deleteOTP(email) {
    const key = `otp:${email}`;
    await redis.del(key);
  }

  async incrementRateLimit(identifier, windowSeconds = 900) {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return current;
  }

  async getRateLimitCount(identifier) {
    const key = `ratelimit:${identifier}`;
    const count = await redis.get(key);
    return parseInt(count) || 0;
  }

  async lockInventory(productId, userId, quantity, expirySeconds = 300) {
    const key = `lock:${productId}:${userId}`;
    const lockData = { quantity, lockedAt: Date.now() };
    return await this.set(key, lockData, expirySeconds);
  }

  async getInventoryLock(productId, userId) {
    const key = `lock:${productId}:${userId}`;
    return await this.get(key);
  }
  async releaseInventoryLock(productId, userId) {
    const key = `lock:${productId}:${userId}`;
    return await this.del(key);
  }

  async addToLeaderboard(leaderboardName, member, score) {
    const key = `leaderboard:${leaderboardName}`;
    await redis.zadd(key, score, member);
  }

  async getLeaderboard(leaderboardName, limit = 10) {
    const key = `leaderboard:${leaderboardName}`;
    return await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");
  }

  async getUserRank(leaderboardName, member) {
    const key = `leaderboard:${leaderboardName}`;
    return await redis.zrevrank(key, member);
  }

  async trackEvent(eventType, data) {
    const key = `analytics:${eventType}:${new Date().toISOString().split("T")[0]}`;
    await redis.incr(key);
    await redis.expire(key, 30 * 24 * 3600);
  }

  async getAnalytics(eventType, date) {
    const key = `analytics:${eventType}:${date}`;
    const count = await redis.get(key);
    return parseInt(count) || 0;
  }

  async addRecentlyViewed(userId, productId) {
    const key = `recent:${userId}`;
    await redis.lpush(key, productId);
    await redis.ltrim(key, 0, 19); //last 20
    await redis.expire(key, 7 * 24 * 3600);
  }

  async getRecentlyViewed(userId, limit = 10) {
    const key = `recent:${userId}`;
    const productIds = await redis.lrange(key, 0, limit - 1);
    return productIds;
  }
  async cacheSearchSuggestions(query) {
    const key = `search:suggestions:${query.toLowerCase()}`;
    return await this.get(key);
  }
}

module.exports = new CacheService();
