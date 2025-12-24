import express from "express";
import { signup, login, updateCompanyLogo } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.put("/logo", protect, updateCompanyLogo);

export default router;
