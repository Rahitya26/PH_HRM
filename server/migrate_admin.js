const db = require('./db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const r = await db.query('SELECT * FROM admin_users');
    if (r.rowCount === 0) {
      const h = await bcrypt.hash('ravi@2026', 10);
      await db.query(
        'INSERT INTO admin_users (username, email, password_hash) VALUES ($1, $2, $3)',
        ['ravi', 'admin@daddyhrm.com', h]
      );
      console.log('Created default admin');
    } else {
      console.log('Admin already exists');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
