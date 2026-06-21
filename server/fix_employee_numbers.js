const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function run() {
  try {
    const res = await pool.query('SELECT id FROM employees ORDER BY id ASC');
    let counter = 1;
    for (const row of res.rows) {
      const empNum = `EMP${counter.toString().padStart(4, '0')}`;
      await pool.query('UPDATE employees SET employee_number = $1 WHERE id = $2', [empNum, row.id]);
      counter++;
    }
    console.log('Successfully updated existing employee numbers.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
