const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getOrCreatePrivateChat, deletePrivateChat } = require("../controllers/chats.controller");

const router = express.Router();

// Create or fetch private chat
router.post("/private", authMiddleware, getOrCreatePrivateChat);
router.delete("/private", authMiddleware, deletePrivateChat);


module.exports = router;