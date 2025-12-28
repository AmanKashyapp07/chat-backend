const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_URL
});

// DB connection test (runs once on startup)
(async () => {
  try {
    const res = await pool.query("SELECT current_database()");
    console.log("Connected to DB:", res.rows[0].current_database);
  } catch (err) {
    console.error("DB connection failed:", err.message);
  }
})();

module.exports = pool;