const { redisPub, redisSub } = require("../configs/redis");

class NotificationService {
  constructor() {
    this.subscribers = new Map();
  }

  //Initializing the socket
  initialize(io) {
    this.io = io;
    //subscribe to redis notification
    redisSub.subscribe("notifications");

    redisSub.on("message", (channel, message) => {
      if (channel === "notifications") {
        const notification = JSON.parse(message);
        this.broadcastNotification(notification);
      }
    });

    io.on("connection", (socket) => {
      console.log("client connected: ", socket.id);

      socket.on("authenticate", (userId) => {
        socket.userId = userId;
        socket.join(`user:${userId}`);
        this.subscribers.set(userId, socket.id);
        console.log(`User ${userId} authenticated`);
      });
      socket.on("disconnect", () => {
        if (socket.userId) {
          this.subscribers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });
    });
  }

  // sending notification to a specific user
  async sendToUser(userId, notification) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit("notification", notification);
    }

    await redisPub.publish(
      "notifications",
      JSON.stringify({
        type: "user",
        userId,
        ...notification,
      }),
    );
  }

  //brodcast to all connected user
  async broadcastNotification(notification) {
    if (this.io) {
      if (notification.type === "user" && notification.userId) {
        this.io
          .to(`user:${notification.userId}`)
          .emit("notification", notification);
      } else {
        this.io.emit("notification", notification);
      }
    }
  }

  // send flash sale notification
  async notifyFlashSale(productData) {
    const notification = {
      type: "flash-sale",
      title: "Flash Sale Alert! 🔥",
      message: `${productData.name} is now on flash sale!`,
      data: productData,
      timestamp: new Date(),
    };
    await redisPub.publish("notifications", JSON.stringify(notification));
  }

  //send order status update
  async notifyOrderStatus(userId, orderData) {
    const notification = {
      type: "order-status",
      title: "Order Update",
      message: `Your order #${orderData.orderNumber} status: ${orderData.status}`,
      data: orderData,
      timestamp: new Date(),
    };
    await this.sendToUser(userId, notification);
  }

  //send low stock alert (for admins)
  async notifyLowStock(productData) {
    const notification = {
      type: "low-stck",
      title: "Low Stock Alert",
      message: `${productData.name} is running low (${productData.stock} left)`,
      data: productData,
      timestamp: new Date(),
    };
    await redisPub.publish("notifications", JSON.stringify(notification));
  }

  // get user online status
  isUserOnline(userId) {
    return this.subscribers.has(userId);
  }

  // tottal connected users
  getConnectedUsersCount() {
    return this.subscribers.size;
  }
}

module.exports = new NotificationService();
