import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import connectDB from "./config/db.js";

import companyRoutes from "./routes/companyRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import gameSessionRoutes from "./routes/gameSessionRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { gameSocket } from "./sockets/gameSocket.js";

const app = express();
const server = http.createServer(app);

await connectDB();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/companies", companyRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/game-sessions", gameSessionRoutes);
app.use("/api/upload", uploadRoutes);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

export { io };
gameSocket();

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
