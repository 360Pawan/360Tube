require("dotenv").config();

import { connectDB } from "./db";
import { app } from "./app";

(async () => {
  try {
    await connectDB();

    app.listen(process.env.PORT || 8080, () => {
      console.log(`\n 🚀 App is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log(`\n 😰 Error while initializing app ${error}`);
  }
})();
