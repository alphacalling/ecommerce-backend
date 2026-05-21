const cron = require("node-cron");
const Cart = require("../models/Cart");
const InventoryLock = require("../models/InventoryLock");
const cacheService = require("../services/cacheService");

// Clean expired carts every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("Cleaning expired carts...");

    const expiredCarts = await Cart.find({
      expiresAt: { $lt: new Date() },
    });

    for (const cart of expiredCarts) {
      for (const item of cart.items) {
        await cacheService.releaseInventoryLock(
          item.productId.toString(),
          cart.userId.toString(),
        );
      }

      await cart.deleteOne();
    }

    console.log(`Cleaned ${expiredCarts.length} expired carts`);
  } catch (error) {
    console.error("Cart cleanup error:", error);
  }
});

// Clean expired inventory locks every minute
cron.schedule("* * * * *", async () => {
  try {
    console.log("Cleaning expired inventory locks...");

    const result = await InventoryLock.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    if (result.deletedCount > 0) {
      console.log(`Released ${result.deletedCount} inventory locks`);
    }
  } catch (error) {
    console.error("Inventory lock cleanup error:", error);
  }
});

console.log("Cart expiry worker started");
