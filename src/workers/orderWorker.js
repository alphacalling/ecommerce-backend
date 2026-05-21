const { orderQueue } = require("../services/queueService");
const Order = require("../models/Order");
const Product = require("../models/Product");
const notificationService = require("../services/notificationService");

orderQueue.process("process-order", async (job) => {
  const { orderId } = job.data;
  console.log(`Processing order ${orderId}`);

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  order.status = "processing";
  order.statusHistory.push({
    status: "processing",
    note: "Order is being processed",
  });
  await order.save();
  await notificationService.notifyOrderStatus(order.userId.toString(), {
    orderNumber: order.orderNumber,
    status: "processing",
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));

  order.status = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Order confirmed",
  });
  await order.save();
  await notificationService.notifyOrderStatus(order.userId.toString(), {
    orderNumber: order.orderNumber,
    status: "confirmed",
  });

  return { orderId, status: "confirmed" };
});

// Update inventory
orderQueue.process("update-inventory", async (job) => {
  const { productId, quantity } = job.data;
  console.log(`Updating inventory for product ${productId}`);

  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: quantity },
  });

  return { productId, quantity };
});

// Event listeners
orderQueue.on("completed", (job, result) => {
  console.log(`✅ Order job ${job.id} completed`);
});

orderQueue.on("failed", (job, err) => {
  console.error(`❌ Order job ${job.id} failed:`, err.message);
});

console.log("Order worker started");
