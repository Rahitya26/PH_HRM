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
    
    // Add column
    await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);`);
    
    // Populate existing
    await client.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER(ORDER BY id) as rn
        FROM employees
        WHERE employee_number IS NULL
      )
      UPDATE employees e SET employee_number = n.rn::VARCHAR FROM numbered n WHERE e.id = n.id;
    `);

    // Add unique constraint and NOT NULL
    // We catch errors in case constraint already exists
    try {
      await client.query(`ALTER TABLE employees ADD CONSTRAINT unique_employee_number UNIQUE(employee_number);`);
      await client.query(`ALTER TABLE employees ALTER COLUMN employee_number SET NOT NULL;`);
    } catch (e) {
      console.log("Constraint might already exist:", e.message);
    }

    console.log("Altered employees table successfully.");
  } catch (e) {
    console.error("Error altering table:", e);
  } finally {
    await client.end();
  }
}

alterDb();
