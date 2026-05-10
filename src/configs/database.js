const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected successfully");
  } catch (err) {
    console.log("error while connecting with database: ", error.message);
  }
};

module.exports = connectDB;

// const { Pool } = require("pg");

// const pool = new Pool({
//   user: "postgres",
//   password: "Vikas",
//   port: "5432",
//   database: "redis",
//   host: "localhost",
// });

// pool
//   .connect()
//   .then(() => {
//     console.log("Database connected successfully");
//   })
//   .catch((err) => {
//     console.log("Error while connecting with database: ", err.message);
//   });

// module.exports = pool;
