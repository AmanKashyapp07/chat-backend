const pool = require("../config/db");

const getOrCreatePrivateChat = async (req, res, next) => {
  const user1 = req.user.id;      // Logged-in user
  const user2 = req.body.userId;  // Target user

  if (!user2 || user1 === user2) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    // 1️⃣ Check if private chat already exists
    let chatResult = await pool.query(
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

    let chatId;

    if (chatResult.rows.length > 0) {
      chatId = chatResult.rows[0].id;
    } else {
      // 2️⃣ Create new private chat if it doesn't exist
      const newChat = await pool.query(
        "INSERT INTO chats (type) VALUES ('private') RETURNING id"
      );
      chatId = newChat.rows[0].id;

      // 3️⃣ Add both users as members
      await pool.query(
        "INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)",
        [chatId, user1, user2]
      );
    }

    // 4️⃣ FETCH MESSAGE HISTORY
    // We fetch the history regardless of whether the chat was just created or already existed
    const history = await pool.query(
      `
      SELECT sender_id AS "senderId", content AS text, created_at 
      FROM messages 
      WHERE chat_id = $1 
      ORDER BY created_at ASC
      `,
      [chatId]
    );

    res.status(200).json({ 
      chatId, 
      messages: history.rows // This sends the old chats back to React
    });

  } catch (err) {
    next(err);
  }
};

const deletePrivateChat = async (req, res, next) => {
  const user1 = req.user.id;        // logged-in user
  const user2 = req.body.userId;    // target user

  if (!user2 || user1 === user2) {
    return res.status(400).json({ message: "Invalid user" });
  }

  try {
    // 1️⃣ Find all private chats between the two users
    const chatsResult = await pool.query(
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

    if (chatsResult.rows.length === 0) {
      return res.status(404).json({ message: "No private chat found" });
    }

    const chatIds = chatsResult.rows.map(row => row.id);

    // 2️⃣ Delete chats (messages & members auto-deleted via CASCADE)
    await pool.query(
      `DELETE FROM chats WHERE id = ANY($1::int[])`,
      [chatIds]
    );

    res.json({
      message: "Private chat deleted successfully",
      deletedChats: chatIds
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOrCreatePrivateChat,
  deletePrivateChat
};