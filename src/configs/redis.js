const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.log("Redis Error: ", err);
});

// PUB/SUB

const redisPub = redis.duplicate();
const redisSub = redis.duplicate();

module.exports = { redis, redisSub, redisPub };




// const Redis = require("ioredis");

// const redis = new Redis({
//   host: "127.0.01",
//   port: 6379,
// });

// redis.on("connect", () => {
//   console.log("Redis connected successfully");
// });

// module.exports = redis;
