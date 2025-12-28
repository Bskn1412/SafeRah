import express from "express";
import { setupRecovery } from "../controllers/recoveryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected route
router.post("/setup", authMiddleware, setupRecovery);

export default router;
