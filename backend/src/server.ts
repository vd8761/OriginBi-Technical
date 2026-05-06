import "dotenv/config";
import app from "./app";
import { testConnection } from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    console.log("PostgreSQL connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Database connection error: ${(error as Error).message}`);
    process.exit(1);
  }
};

startServer();
