const pool = require("../config/db");

const getOrCreatePrivateChat = async (req, res, next) => {
  const user1 = req.user.id;      // logged-in user
  const user2 = req.body.userId;  // target user

  if (!user2 || user1 === user2) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    // 1️⃣ Check if private chat already exists
    const existingChat = await pool.query(
      `
      SELECT c.id
      FROM chats c
      JOIN chat_members cm1 ON cm1.chat_id = c.id
      JOIN chat_members cm2 ON cm2.chat_id = c.id
      WHERE c.type = 'private'
        AND cm1.user_id = $1
        AND cm2.user_id = $2
      `,
      [user1, user2]
    );

    if (existingChat.rows.length > 0) {
      return res.json({ chatId: existingChat.rows[0].id });
    }

    // 2️⃣ Create new private chat
    const chatResult = await pool.query(
      "INSERT INTO chats (type) VALUES ('private') RETURNING id"
    );

    const chatId = chatResult.rows[0].id;

    // 3️⃣ Add both users as members
    await pool.query(
      `
      INSERT INTO chat_members (chat_id, user_id)
      VALUES ($1, $2), ($1, $3)
      `,
      [chatId, user1, user2]
    );

    res.status(201).json({ chatId });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrCreatePrivateChat
};