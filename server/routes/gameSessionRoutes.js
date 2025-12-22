import express from "express";
import {
  createGameSession,
  joinGameSession,
  startGame,
  submitAnswer,
  finishGame,
  getGameSessionByLobbyCode,
} from "../controllers/gameSessionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGameSession);
router.post("/join", joinGameSession);
router.post("/:sessionId/start", protect, startGame);
router.post("/answer", submitAnswer);
router.post("/:sessionId/finish", protect, finishGame);

router.get("/:lobbyCode", getGameSessionByLobbyCode);

export default router;
