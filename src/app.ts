import express from "express";
import userRoutes from "./routes/user.route";
import documentRoutes from "./routes/document.route";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

// Parsers
app.use(express.json());

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/documents", documentRoutes);

// Global Error Handler (must be registered last)
app.use(errorHandler);

export default app;
