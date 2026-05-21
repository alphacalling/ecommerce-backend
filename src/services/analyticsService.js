const cacheService = require("./cacheService");
const viewHistory = require("../models/ViewHistory");
const SearchHistory = require("../models/SearchHistory");
const Order = require("../models/Order");
const { redis } = require("../configs/redis");

class AnalyticsService {
  // Track page view
  async trackPageView(data) {
    const { userId, productId, sessionId, ip, source } = data;

    await ViewHistory.create({
      userId,
      productId,
      sessionId,
      ip,
      source,
    });

    await cacheService.trackEvent("pageView", data);

    if (productId) {
      await redis.hincrby(`product:stats:${productId}`, "views", 1);
    }
  }

  // Tracking Search
  async trackSearch(data) {
    const { userId, query, resultCount, ip, userAgent } = data;
    await SearchHistory.create({
      userId,
      query,
      resultCount,
      ip,
      userAgent,
    });

    await cacheService.trackEvent("search", data);

    await redis.zincrby("popular:searches", 1, query.toLowerCase());
  }

  // tracking product click from search
  async trackSearchClick(searchId, productId) {
    await SearchHistory.findByIdAndUpdate(searchId, {
      clickedProduct: productId,
    });
    await cacheService.trackEvent("search-click", { searchId, productId });
  }

  //Track add to cart
  async trackAddToCart(data) {
    const { userId, productId, quantity, price } = data;
    await cacheService.trackEvent("add-to-cart", data);
    await redis.hincrby(`product:stats:${productId}`, "cart_adds", 1);
    await cacheService.addToLeaderboard("user:activity", userId, 2);
  }

  //Track purchase
  async trackPurchase(data) {
    const { userId, orderId, items, totalAmount } = data;
    await cacheService.trackEvent("purchase", data);

    for (const item of items) {
      await redis.hincrby(
        `product:stats:${item.productId}`,
        "purchases",
        item.quantity,
      );
    }
    await cacheService.addToLeaderboard("user:activity", userId, 10);
    await redis.hincrbyfloat(
      `user:stats:${userId}`,
      "total_spend",
      totalAmount,
    );
  }

  // Get popular searches
  async getPopularSearches(limit = 10) {
    const searches = await redis.zrevrange(
      "popular:searches",
      0,
      limit - 1,
      "WITHSCORES",
    );

    const result = [];
    for (let i = 0; i < searches.length; i += 2) {
      result.push({
        query: searches[i],
        count: parseInt(searches[i + 1]),
      });
    }

    return result;
  }

  // Get product stats
  async getProductStats(productId) {
    const stats = await redis.hgetall(`product:stats:${productId}`);

    return {
      views: parseInt(stats.views) || 0,
      cart_adds: parseInt(stats.cart_adds) || 0,
      purchases: parseInt(stats.purchases) || 0,
      conversion_rate:
        stats.views > 0
          ? ((parseInt(stats.purchases) / parseInt(stats.views)) * 100).toFixed(
              2,
            )
          : 0,
    };
  }

  // Get user stats
  async getUserStats(userId) {
    const stats = await redis.hgetall(`user:stats:${userId}`);
    const rank = await cacheService.getUserRank("user:activity", userId);

    return {
      total_spend: parseFloat(stats.total_spend) || 0,
      activity_rank: rank !== null ? rank + 1 : null,
    };
  }

  // Get real-time dashboard data
  async getDashboardData(date = new Date().toISOString().split("T")[0]) {
    const [
      pageviews,
      searches,
      addToCarts,
      purchases,
      popularSearches,
      topUsers,
    ] = await Promise.all([
      cacheService.getAnalytics("pageview", date),
      cacheService.getAnalytics("search", date),
      cacheService.getAnalytics("add-to-cart", date),
      cacheService.getAnalytics("purchase", date),
      this.getPopularSearches(5),
      cacheService.getLeaderboard("user:activity", 10),
    ]);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const todayOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const revenue = todayOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );
    return {
      today: {
        pageviews,
        searches,
        addToCarts,
        purchases,
        orders: todayOrders.length,
        revenue: revenue.toFixed(2),
      },
      popularSearches,
      topUsers: this.formatLeaderboard(topUsers),
      conversionRate:
        pageviews > 0 ? ((purchases / pageviews) * 100).toFixed(2) : 0,
    };
  }
  formatLeaderboard(data) {
    const result = [];
    for (let i = 0; i < data.length; i += 2) {
      result.push({
        userId: data[i],
        score: parseInt(data[i + 1]),
      });
    }
    return result;
  }

  // Get trending products based on recent activity
  async calculateTrendingProducts() {
    const products = await redis.keys("product:stats:*");
    const trending = [];

    for (const key of products) {
      const productId = key.split(":")[2];
      const stats = await this.getProductStats(productId);

      const score =
        stats.views * 1 + stats.cart_adds * 5 + stats.purchases * 10;

      if (score > 0) {
        trending.push({ productId, score });
      }
    }
    trending.sort((a, b) => b.score - a.score);
    return trending.slice(0, 20);
  }
}

module.exports = new AnalyticsService();
