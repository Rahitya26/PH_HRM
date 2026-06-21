require('dotenv').config();
const { Client } = require('pg');

async function fixShifts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    await client.query(`
      ALTER TABLE shifts
      ADD COLUMN IF NOT EXISTS is_split_shift BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS second_start_time TIME,
      ADD COLUMN IF NOT EXISTS second_end_time TIME;
    `);

    console.log("Successfully added split shift columns to Supabase!");
  } catch (e) {
    console.error('Error altering table:', e);
  } finally {
    await client.end();
  }
}

fixShifts();
