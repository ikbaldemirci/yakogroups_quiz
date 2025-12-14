import mongoose from "mongoose";

const OptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    options: {
      type: [OptionSchema],
      validate: [(val) => val.length >= 2, "At least two options are required"],
    },

    correctOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    points: {
      type: Number,
      default: 100,
      min: 0,
    },

    order: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Question", QuestionSchema);
