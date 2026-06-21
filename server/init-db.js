require('dotenv').config();
const { Client } = require('pg');

async function initDb() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres', // connect to default to create our db
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = '${process.env.DB_NAME}'`);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log(`Database '${process.env.DB_NAME}' created.`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }
  } catch (e) {
    console.error('Error creating database', e);
  } finally {
    await client.end();
  }

  // Now connect to the actual db to create tables
  const dbClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await dbClient.connect();

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
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
        has_pt BOOLEAN DEFAULT FALSE,
        has_esi BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert a default shift if not exists
    const shiftRes = await dbClient.query("SELECT * FROM shifts WHERE name = 'Regular Shift'");
    if (shiftRes.rowCount === 0) {
      await dbClient.query("INSERT INTO shifts (name, start_time, end_time, is_default) VALUES ('Regular Shift', '10:00:00', '19:00:00', TRUE)");
    }
    
    console.log('Tables created successfully.');
  } catch (e) {
    console.error('Error creating tables', e);
  } finally {
    await dbClient.end();
  }
}

initDb();
