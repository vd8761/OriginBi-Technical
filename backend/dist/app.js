"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const assessmentRoutes_1 = __importDefault(require("./routes/assessmentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
// Routes
app.use("/api/assessment", assessmentRoutes_1.default);
app.use("/api/assessment/admin", adminRoutes_1.default);
app.get("/", (req, res) => {
    res.send("OriginBi API is running");
});
// Error Middleware
app.use(errorMiddleware_1.errorHandler);
exports.default = app;
