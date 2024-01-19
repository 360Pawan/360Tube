import mongoose from "mongoose";

import { DB_NAME } from "@/constants";

export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );

    console.log(
      `\n 👍 Database connected successfully. : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(`\n 😰 Database connection error : ${error}`);
    process.exit(1);
  }
};
