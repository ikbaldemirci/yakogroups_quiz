import express from "express";
import {
  createGameSession,
  joinGameSession,
  startGame,
  submitAnswer,
  finishGame,
  getGameSessionByLobbyCode,
} from "../controllers/gameSessionController.js";

const router = express.Router();

router.post("/", createGameSession);
router.post("/join", joinGameSession);
router.post("/:sessionId/start", startGame);
router.post("/answer", submitAnswer);
router.post("/:sessionId/finish", finishGame);

router.get("/:lobbyCode", getGameSessionByLobbyCode);

export default router;
