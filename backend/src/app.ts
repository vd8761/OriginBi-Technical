import express, { Application, Request, Response } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorMiddleware";
import assessmentRoutes from "./routes/assessmentRoutes";

const app: Application = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/assessment", assessmentRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("OriginBi API is running");
});

// Error Middleware
app.use(errorHandler);

export default app;
