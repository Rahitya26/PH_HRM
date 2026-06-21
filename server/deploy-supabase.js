require('dotenv').config();
const { Client } = require('pg');

async function syncDb() {
  console.log("Connecting to Supabase using DATABASE_URL...");
  
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is missing from .env!");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase!");

    console.log("Creating tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(50) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        employee_number VARCHAR(50) UNIQUE NOT NULL,
        designation VARCHAR(100),
        package_ctc NUMERIC(12, 2),
        work_type VARCHAR(50),
        joining_date DATE,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE SET NULL,
        phone VARCHAR(20),
        address TEXT,
        pan_number VARCHAR(20),
        aadhar_number VARCHAR(20),
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_ifsc VARCHAR(20),
        bank_branch VARCHAR(100),
        has_epf BOOLEAN DEFAULT FALSE,
        epf_number VARCHAR(255),
        epf_amount INTEGER DEFAULT 0,
        has_pt BOOLEAN DEFAULT FALSE,
        has_esi BOOLEAN DEFAULT FALSE,
        esi_number VARCHAR(255),
        esi_amount INTEGER DEFAULT 0,
        branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        ot_hours NUMERIC(5, 2) DEFAULT 0,
        salary_advance NUMERIC(10, 2) DEFAULT 0,
        other_allowance NUMERIC(10, 2) DEFAULT 0,
        UNIQUE (employee_id, date)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_loans (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        deduction_amount NUMERIC(10, 2) NOT NULL,
        start_month VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("All tables created successfully!");

  } catch (e) {
    console.error('Error creating tables:', e);
  } finally {
    await client.end();
    console.log("Deployment sync finished.");
  }
}

syncDb();
