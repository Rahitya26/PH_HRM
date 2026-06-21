require('dotenv').config();
const { Client } = require('pg');

async function alterDb() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    
    // Check if is_split_shift exists before adding
    await client.query(`
      ALTER TABLE shifts 
      ADD COLUMN IF NOT EXISTS is_split_shift BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS second_start_time TIME,
      ADD COLUMN IF NOT EXISTS second_end_time TIME;
    `);
    console.log("Altered shifts table successfully.");
  } catch (e) {
    console.error("Error altering table:", e);
  } finally {
    await client.end();
  }
}

alterDb();
