const pool = require("../config/db");

const getAllUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, username FROM users WHERE id != $1",
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers
};