const pool = require("../config/db");

const getOrCreatePrivateChat = async (req, res, next) => {
  const user1 = req.user.id; // Logged-in user
  const user2 = req.body.userId; // Target user

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
      messages: history.rows, // This sends the old chats back to React
    });
  } catch (err) {
    next(err);
  }
};

const deletePrivateChat = async (req, res, next) => {
  const user1 = req.user.id; // logged-in user
  const user2 = req.body.userId; // target user

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

    const chatIds = chatsResult.rows.map((row) => row.id);

    // 2️⃣ Delete chats (messages & members auto-deleted via CASCADE)
    await pool.query(`DELETE FROM chats WHERE id = ANY($1::int[])`, [chatIds]);

    res.json({
      message: "Private chat deleted successfully",
      deletedChats: chatIds,
    });
  } catch (err) {
    next(err);
  }
};

// 1. CREATE GROUP CHAT
const createGroupChat = async (req, res, next) => {
  const userId = req.user.id; // Creator
  const { name, memberIds } = req.body; // Group Name and array of User IDs

  if (!name || !memberIds || memberIds.length === 0) {
    return res
      .status(400)
      .json({ message: "Group name and members are required" });
  }

  try {
    // 1. Create the Chat Entry
    const chatResult = await pool.query(
      "INSERT INTO chats (type, name) VALUES ('group', $1) RETURNING id, name, type, created_at",
      [name]
    );
    const newChat = chatResult.rows[0];

    // 2. Add Creator + Selected Members to chat_members
    // We combine the creator's ID with the list of selected members
    const uniqueMembers = [...new Set([userId, ...memberIds])];

    // Generate SQL for multiple inserts: ($1, $2), ($3, $4)...
    // This is a dynamic query builder approach
    const values = [];
    const placeholders = [];

    uniqueMembers.forEach((memberId, index) => {
      values.push(newChat.id, memberId);
      placeholders.push(`($${index * 2 + 1}, $${index * 2 + 2})`);
    });

    const insertQuery = `
      INSERT INTO chat_members (chat_id, user_id) 
      VALUES ${placeholders.join(", ")}
    `;

    await pool.query(insertQuery, values);

    res.json(newChat);
  } catch (err) {
    next(err);
  }
};

// 2. GET MY GROUPS
const getUserGroups = async (req, res, next) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type 
       FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = $1 AND c.type = 'group'
       ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getGroupChats = async (req, res, next) => {
  const { chatId } = req.params;
  try {
    // Simple verification: ensure user is a member of this chat
    const memberCheck = await pool.query(
      "SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2",
      [chatId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member" });
    }

    const history = await pool.query(
      `SELECT sender_id AS "senderId", content AS text, created_at 
       FROM messages WHERE chat_id = $1 ORDER BY created_at ASC`,
      [chatId]
    );

    res.json(history.rows);
  } catch (err) {
    next(err);
  }
};
const getGroupChatsMembers = async (req, res, next) => {
  const { chatId } = req.params;

  try {
    // 1️⃣ Verify user is a member of this chat
    const memberCheck = await pool.query(
      "SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2",
      [chatId, req.user.id]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ message: "Not a member" });
    }

    // 2️⃣ Fetch group members
    const members = await pool.query(
      `
      SELECT u.id, u.username
      FROM chat_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.chat_id = $1
      ORDER BY u.username
      `,
      [chatId]
    );
    const usernames = members.rows.map((row) => row.username);
    res.json(usernames);
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getOrCreatePrivateChat,
  deletePrivateChat,
  createGroupChat,
  getUserGroups,
  getGroupChats,
  getGroupChatsMembers,
};
