import express from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deactivateCompany,
  approveCompany,
} from "../controllers/companyController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createCompany);
router.get("/", getCompanies);
router.put("/:id/approve", protect, adminOnly, approveCompany);

router.get("/:id", getCompanyById);
router.put("/:id", updateCompany);
router.delete("/:id", deactivateCompany);

export default router;
