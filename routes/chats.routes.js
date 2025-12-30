const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getOrCreatePrivateChat, deletePrivateChat, createGroupChat, getUserGroups, getGroupChats, getGroupChatsMembers, deleteGroupChats } = require("../controllers/chats.controller");

const router = express.Router();

// Create or fetch private chat
router.post("/private", authMiddleware, getOrCreatePrivateChat);
router.delete("/private", authMiddleware, deletePrivateChat);
router.post("/group", authMiddleware, createGroupChat);
router.get("/group", authMiddleware, getUserGroups);
router.get("/group/fetch/:chatId", authMiddleware, getGroupChats);
router.delete("/group/fetch/:chatId", authMiddleware, deleteGroupChats);
router.get("/group/fetch/:chatId/members", authMiddleware, getGroupChatsMembers);




module.exports = router;