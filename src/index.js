import dotenv from "dotenv";

import { connectDB } from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./.env" });

(async () => {
  try {
    await connectDB();

    app.listen(process.env.PORT || 8080, () => {
      console.log(`\n 🚀  App is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log(`\n 😰 Error while initializing app ${error}`);
  }
})();
