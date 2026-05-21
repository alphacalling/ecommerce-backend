const Queue = require("bull");

const redisUrl = new URL(process.env.REDIS_URL);

const emailQueue = new Queue("email", {
  redis: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  },
});

const orderQueue = new Queue("order", {
  redis: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  },
});

const notificationQueue = new Queue("notification", {
  redis: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
  },
});

class QueueService {
  //email queue methods
  async addEmailJob(type, data, options = {}) {
    return await emailQueue.add(type, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      ...options,
    });
  }
  async sendOTPEmail(email, otp, name) {
    return await this.addEmailJob(
      "send-otp",
      { email, otp, name },
      {
        priority: 1,
      },
    );
  }
  async sendWelcomeEmail(email, name) {
    return await this.addEmailJob("send-welcome", { email, name });
  }

  async sendOrderConfirmation(email, orderDetails) {
    return await this.addEmailJob("send-order-confirmation", {
      email,
      orderDetails,
    });
  }

  async addOrderJob(type, data, options = {}) {
    return await orderQueue.add(type, data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      ...options,
    });
  }

  // async addOrderJob(type, data, options = {}) {
  //   return await orderQueue.add(type, data, {
  //     attempts: 3,
  //     backoff: {
  //       type: "exponential",
  //       delay: 2000,
  //     },
  //     ...options,
  //   });
  // }
  async processOrder(orderId) {
    return await this.addOrderJob("process-order", { orderId });
  }
  async updateInventory(productId, quantity) {
    return await this.addOrderJob("update-inventory", { productId, quantity });
  }

  //Notification queue methods
  async addNotificationJob(type, data, options = {}) {
    return await notificationQueue.add(type, data, {
      attempts: 2,
      ...options,
    });
  }
  async sendNotification(userId, message, type = "info") {
    return await this.addNotificationJob("send-notification", {
      userId,
      message,
      type,
      timestamp: new Date(),
    });
  }
  async broadcastNotification(message, type = "info") {
    return await this.addNotificationJob("broadcast-notification", {
      message,
      type,
      timestamp: new Date(),
    });
  }
  async getQueueStats(queueName) {
    let queue;
    switch (queueName) {
      case "email":
        queue = emailQueue;
        break;
      case "order":
        queue = orderQueue;
        break;
      case "notification":
        queue = notificationQueue;
        break;
      default:
        throw new Error("Invalid queue name");
    }
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  async getAllQueuesStats() {
    const [email, order, notification] = await Promise.all([
      this.getQueueStats("email"),
      this.getQueueStats("order"),
      this.getQueueStats("notification"),
    ]);
    return { email, order, notification };
  }

  //clean old jobs
  async cleanQueue(queueName, grace = 24 * 3600 * 1000) {
    let queue;
    switch (queueName) {
      case "email":
        queue = emailQueue;
        break;
      case "order":
        queue = orderQueue;
        break;
      case "notification":
        queue = notificationQueue;
        break;
      default:
        throw new Error("Invalid queue name");
    }
    await queue.clean(grace, "completed");
    await queue.clean(grace, "failed");
  }
}

module.exports = {
  queueService: new QueueService(),
  emailQueue,
  orderQueue,
  notificationQueue,
};
