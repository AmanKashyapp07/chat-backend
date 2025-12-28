require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const pool = require("./config/db"); // ✅ ADDED (required for db-test)

/**
 * 1. SERVER SETUP
 * We create an Express app, but Socket.io requires a standard HTTP server.
 * We wrap the Express 'app' inside the 'http' server.
 */
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS so your frontend can talk to this backend

const server = http.createServer(app);

/**
 * 2. SOCKET.IO INITIALIZATION
 * We attach Socket.io to the HTTP server and configure CORS.
 * 'origin' must match your React app's URL (usually localhost:5173).
 */
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

/**
 * 3. CONNECTION HANDLING
 * This 'io.on("connection")' block is the entry point.
 * It triggers every time a new user opens your website.
 */
io.on("connection", (socket) => {
  // 'socket' represents the specific connection to ONE unique user.
  console.log("A user connected with ID:", socket.id);

  /**
   * 4. JOIN EVENT
   * When the frontend calls socket.emit("join", username), this triggers.
   */
  socket.on("join", (username) => {
    // We "tack on" the username to the socket object itself.
    // This allows us to remember who this specific connection belongs to.
    socket.username = username;
    console.log(`${username} is now ready to chat.`);
    // ADD THIS: Broadcast to EVERYONE that a new user joined
    io.emit("receiveMessage", {
      user: "System",                // Identify this as a system alert
      text: `${username} has joined the chat!`,
      isSystem: true                 // Extra flag to style it differently later
    });
  });
socket.on("disconnect", () => {
    // Check if the user had actually joined with a name
    if (socket.username) {
      console.log(`${socket.username} left the chat`);

      // Broadcast to everyone that this specific user left
      io.emit("receiveMessage", {
        user: "System",
        text: `${socket.username} has left the chat.`,
        isSystem: true
      });
    }
  });
  /**
   * 5. MESSAGE BROADCASTING (The most important part)
   * When a user sends a message, we receive it here.
   */
  socket.on("sendMessage", (data) => {
    // We only process the message if the user has joined (has a username).
    if (!socket.username) return;

    /**
     * io.emit vs socket.emit:
     * socket.emit would send a message back to ONLY the sender.
     * io.emit sends the message to EVERYONE currently connected to the server.
     */
    io.emit("receiveMessage", {
      user: socket.username, // We use the name we saved earlier in the 'join' event
      text: data.text        // The actual message content from the frontend
    });
  });

  /**
   * 6. DISCONNECT HANDLING
   * Happens automatically when a user closes their browser tab.
   */
  socket.on("disconnect", () => {
    console.log(`User ${socket.username || socket.id} has left the chat.`);
  });
});

/**
 * 7. START THE ENGINE
 * The server listens on port 8000.
 */
app.use("/api/auth", require("./routes/auth.routes"));

server.listen(8000, () => {
  console.log("Chat Server is live at http://localhost:8000");
});