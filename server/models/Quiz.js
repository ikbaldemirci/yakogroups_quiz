import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    description: {
      type: String,
      maxlength: 500,
    },

    backgroundColor: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
    },

    totalScore: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Quiz", QuizSchema);
