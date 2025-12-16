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
      required: [true, "Soru metni gereklidir."],
      trim: true,
      minlength: [3, "Soru metni en az 3 karakter olmalıdır."],
    },

    options: {
      type: [OptionSchema],
      validate: [(val) => val.length >= 2, "En az iki seçenek gereklidir."],
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

    durationSeconds: {
      type: Number,
      required: true,
      min: [5, "Süre en az 5 saniye olmalıdır."],
      default: 10,
    },

    isAiGenerated: {
      type: Boolean,
      default: false,
    },

    image: {
      type: String,
      default: null,
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
