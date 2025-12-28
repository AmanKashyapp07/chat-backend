const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

const signup = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, hashed, "user"] 
    );

    const newUser = result.rows[0];

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      SECRET,
      { expiresIn: "2h" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "user already exists." });
    }
    next(err);
  }
};

// ---------------- LOGIN ----------------
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------- GET CURRENT USER ----------------
const me = async (req, res, next) => {
  try {
    res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  me,
};