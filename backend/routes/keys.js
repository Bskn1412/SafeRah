// backend/routes/keys.js
import express from "express";
import { getKeys, storeKeys } from "../controllers/keysController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/get", authMiddleware, getKeys);
router.post("/store", authMiddleware, storeKeys);

export default router;
