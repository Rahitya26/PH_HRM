require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`ALTER TABLE employees ADD COLUMN payment_mode VARCHAR(20) DEFAULT 'Cash'`);
    console.log('Successfully added payment_mode column to Supabase!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', err.message);
    }
  } finally {
    process.exit(0);
  }
}

run();
