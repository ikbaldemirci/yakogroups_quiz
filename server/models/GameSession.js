import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },

    score: {
      type: Number,
      default: 0,
    },

    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedOptionIndex: Number,
        isCorrect: Boolean,
        earnedScore: Number,
        answeredAt: Date,
      },
    ],
  },
  { _id: false }
);

const GameSessionSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    lobbyCode: {
      type: String,
      required: true,
      unique: true,
      length: 6,
    },

    status: {
      type: String,
      enum: ["waiting", "active", "finished"],
      default: "waiting",
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    currentPhase: {
      type: String,
      enum: ["question", "leaderboard", "wheel"],
      default: "question",
    },

    currentPresenter: {
      type: String,
      default: null,
    },

    players: [PlayerSchema],

    startedAt: Date,
    finishedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("GameSession", GameSessionSchema);
