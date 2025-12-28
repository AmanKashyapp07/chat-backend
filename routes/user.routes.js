const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { getAllUsers } = require("../controllers/user.controller");

const router = express.Router();

// GET all users except logged-in user
router.get("/", authMiddleware, getAllUsers);

module.exports = router;