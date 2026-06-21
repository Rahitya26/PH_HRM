const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hrm_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS other_allowance INTEGER DEFAULT 0;
    `);
    console.log("Added other_allowance to attendance.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
