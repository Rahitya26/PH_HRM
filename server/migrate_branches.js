const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hrm_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function migrate() {
  try {
    console.log("Starting migration...");
    
    // Create branches table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default branch
    await pool.query(`
      INSERT INTO branches (name) VALUES ('PistaHouse') ON CONFLICT DO NOTHING;
    `);
    
    // Get PistaHouse id
    const branchRes = await pool.query(`SELECT id FROM branches WHERE name = 'PistaHouse' LIMIT 1;`);
    const branchId = branchRes.rows[0].id;
    
    // Add branch_id to employees
    await pool.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);`);
    await pool.query(`UPDATE employees SET branch_id = $1 WHERE branch_id IS NULL;`, [branchId]);
    
    // Add branch_id to departments
    await pool.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);`);
    await pool.query(`UPDATE departments SET branch_id = $1 WHERE branch_id IS NULL;`, [branchId]);
    
    // Add branch_id to shifts
    await pool.query(`ALTER TABLE shifts ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id);`);
    await pool.query(`UPDATE shifts SET branch_id = $1 WHERE branch_id IS NULL;`, [branchId]);
    
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
