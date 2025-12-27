import express from "express";
import {
    signup, login, updateCompanyLogo,
    verifyEmail,
    forgotPassword,
    resetPassword,
    checkResetToken,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.put("/logo", protect, updateCompanyLogo);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/check-reset-token", checkResetToken);

export default router;
