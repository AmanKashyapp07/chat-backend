require("dotenv").config();
const pool = require("./config/db"); // Ensure the path points to your db config file
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173", // Replace with your frontend URL
  methods: ["GET", "POST"]
}));

// --- HTTP & SOCKET SERVER SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

/**
 * SOCKET.IO LOGIC (Private Messaging)
 */
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  /**
   * 1. JOIN CHAT ROOM
   * When a user clicks a contact, the frontend gets a 'chatId' from the DB.
   * We use that ID as a "Room Name" to keep the conversation private.
   */
  socket.on("joinChat", (chatId) => {
    // A socket can leave previous rooms if necessary, but here we simply join
    socket.join(chatId);
    console.log(`User ${socket.id} joined private room: ${chatId}`);
  });

  /**
   * 2. PRIVATE MESSAGE HANDLING
   * Instead of io.emit (global), we use io.to(chatId).emit (room-specific).
   */
  socket.on("sendMessage", async (data) => {
    const { chatId, senderId, text } = data;

    // debug log to see if server gets it
    console.log("Server received message:", data); 

    try {
      // 1. Save to DB (Assuming you have the pool query setup)
      await pool.query(
        "INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3)",
        [chatId, senderId, text]
      );

      // 2. BROADCAST BACK TO THE ROOM
      // This sends it to everyone in the room, INCLUDING the sender
      io.to(chatId).emit("receiveMessage", {
        chatId,
        senderId,
        text
      });
      
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  /**
   * 3. DISCONNECT
   */
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// --- REST API ROUTES ---
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/chats", require("./routes/chats.routes"));

// --- DATABASE CONNECTION TEST (Optional) ---
// const pool = require("./config/db"); 

// --- SERVER START ---
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});