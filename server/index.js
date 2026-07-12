const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');

// --- Auth ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminResult = await db.query('SELECT * FROM admin_users WHERE username = $1 OR email = $1', [username]);
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      const match = await bcrypt.compare(password, admin.password_hash);
      if (match) {
        return res.json({ role: 'admin', branch_name: 'Admin Dashboard', username: admin.username, email: admin.email });
      }
    }
    const result = await db.query('SELECT * FROM branches WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) {
      return res.json({ role: 'manager', branch_id: result.rows[0].id, branch_name: result.rows[0].name });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Profile & Auth ---
const otpStore = {}; // in-memory store for demo: email -> { otp, expiresAt }

const generateEmailTemplate = (otp) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 12px; border-radius: 12px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px;">PHV HRM</h1>
    </div>
  </div>
  <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center;">
    <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 10px; font-size: 24px;">Admin Verification</h2>
    <p style="color: #64748b; font-size: 15px; margin-bottom: 25px; line-height: 1.5;">You have requested to verify your identity or reset your credentials. Please use the secure OTP below.</p>
    <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
      <strong style="font-size: 32px; color: #4f46e5; letter-spacing: 6px;">${otp}</strong>
    </div>
    <p style="color: #94a3b8; font-size: 13px; margin: 0;">This code will securely expire in <strong style="color: #64748b;">10 minutes</strong>.</p>
  </div>
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">If you did not request this code, please ignore this email or contact support.</p>
</div>
`;

app.post('/api/admin/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };
    
    // Send email using Brevo REST API
    if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: "PHV HRM Admin",
            email: process.env.BREVO_SENDER_EMAIL
          },
          to: [{ email: email }],
          subject: 'PHV HRM - Admin Verification OTP',
          htmlContent: generateEmailTemplate(otp),
          textContent: `Your OTP for PHV HRM Admin Settings is: ${otp}. It will expire in 10 minutes.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Brevo API Error:', errorData);
        throw new Error('Failed to send email via Brevo API. Please check your API key and Sender Email.');
      }

      console.log(`Real email sent to ${email} via Brevo API`);
      res.json({ message: 'OTP sent successfully to your email.' });
    } else {
      // Fallback to console
      console.log(`\n=== MOCK EMAIL SENT ===\nTo: ${email}\nOTP: ${otp}\n=======================\n`);
      res.json({ message: 'OTP mock sent (check server console)' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otpStore[email];
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    // We don't delete it yet because update-profile still needs to verify it,
    // or we can set a flag that it's verified. We'll just leave it and verify again on update.
    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/update-profile', async (req, res) => {
  try {
    const { currentUsername, newUsername, newEmail, otp, newPassword } = req.body;
    
    // Verify OTP again just to be safe
    const stored = otpStore[newEmail];
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    // Hash new password
    const h = await bcrypt.hash(newPassword, 10);
    
    // Update admin user
    // We assume there's only one admin user (id=1) or we match by current username
    const result = await db.query(
      'UPDATE admin_users SET username = $1, email = $2, password_hash = $3 RETURNING *',
      [newUsername, newEmail, h]
    );
    
    delete otpStore[newEmail]; // clear OTP
    
    res.json({ message: 'Profile updated successfully', user: { username: result.rows[0].username, email: result.rows[0].email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password Flow
app.post('/api/admin/forgot-password/send-otp', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Check if it's a branch user
    const branchRes = await db.query('SELECT * FROM branches WHERE username = $1', [username]);
    if (branchRes.rows.length > 0) {
      return res.status(403).json({ error: "Access Denied: Branch accounts cannot reset passwords here. Please contact the Administrator." });
    }

    // Check if it's admin
    const adminRes = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (adminRes.rows.length === 0) {
      return res.status(404).json({ error: 'Username not found' });
    }

    const email = adminRes.rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

    if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: "PHV HRM Admin", email: process.env.BREVO_SENDER_EMAIL },
          to: [{ email: email }],
          subject: 'PHV HRM - Password Reset OTP',
          htmlContent: generateEmailTemplate(otp),
          textContent: `Your OTP for PHV HRM Password Reset is: ${otp}. It will expire in 10 minutes.`
        })
      });

      if (!response.ok) {
        console.error('Brevo API Error:', await response.json());
        throw new Error('Failed to send email via Brevo API.');
      }
      
      const maskedEmail = email.substring(0, 2) + '****' + email.substring(email.indexOf('@'));
      res.json({ message: `OTP sent successfully to ${maskedEmail}`, email });
    } else {
      console.log(`\n=== MOCK EMAIL SENT ===\nTo: ${email}\nOTP: ${otp}\n=======================\n`);
      const maskedEmail = email.substring(0, 2) + '****' + email.substring(email.indexOf('@'));
      res.json({ message: `OTP mock sent to ${maskedEmail} (check console)`, email });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/forgot-password/reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const stored = otpStore[email];
    if (!stored || stored.otp !== otp || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    
    const h = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admin_users SET password_hash = $1 WHERE email = $2', [h, email]);
    
    delete otpStore[email];
    
    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Branches ---
app.get('/api/branches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.*, (SELECT COUNT(*) FROM employees e WHERE e.branch_id = b.id) as employee_count 
      FROM branches b ORDER BY b.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const result = await db.query('INSERT INTO branches (name, username, password) VALUES ($1, $2, $3) RETURNING *', [name, username, password]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const result = await db.query('UPDATE branches SET name=$1, username=$2, password=$3 WHERE id=$4 RETURNING *', [name, username, password, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Departments ---
app.get('/api/departments', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let query = 'SELECT * FROM departments';
    let params = [];
    if (branchId) {
      query += ' WHERE branch_id = $1';
      params.push(branchId);
    }
    query += ' ORDER BY created_at ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const { name, branch_id } = req.body;
    const result = await db.query('INSERT INTO departments (name, branch_id) VALUES ($1, $2) RETURNING *', [name, branch_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Shifts ---
app.get('/api/shifts', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let query = 'SELECT * FROM shifts';
    let params = [];
    if (branchId) {
      query += ' WHERE branch_id = $1';
      params.push(branchId);
    }
    query += ' ORDER BY is_default DESC, created_at ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts', async (req, res) => {
  try {
    const { name, start_time, end_time, is_split_shift, second_start_time, second_end_time, branch_id } = req.body;
    const result = await db.query(
      'INSERT INTO shifts (name, start_time, end_time, is_split_shift, second_start_time, second_end_time, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
      [name, start_time, end_time, is_split_shift || false, second_start_time || null, second_end_time || null, branch_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/shifts/:id', async (req, res) => {
  try {
    const { name, start_time, end_time, is_split_shift, second_start_time, second_end_time } = req.body;
    const result = await db.query(
      'UPDATE shifts SET name=$1, start_time=$2, end_time=$3, is_split_shift=$4, second_start_time=$5, second_end_time=$6 WHERE id=$7 RETURNING *',
      [name, start_time, end_time, is_split_shift || false, second_start_time || null, second_end_time || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shifts/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM shifts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Employees ---
app.get('/api/employees', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let query = `
      SELECT e.*, d.name as department_name, s.name as shift_name 
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
    `;
    let params = [];
    if (branchId) {
      query += ` WHERE e.branch_id = $1`;
      params.push(branchId);
    }
    query += ` ORDER BY e.created_at DESC`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function getNextEmployeeNumber(db) {
  const res = await db.query("SELECT employee_number FROM employees WHERE employee_number LIKE 'EMP%'");
  let maxId = 0;
  for (const row of res.rows) {
    const num = parseInt(row.employee_number.replace('EMP', ''), 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  }
  return `EMP${(maxId + 1).toString().padStart(4, '0')}`;
}

app.get('/api/employees/next-number', async (req, res) => {
  try {
    const nextNumber = await getNextEmployeeNumber(db);
    res.json({ next_number: nextNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    let {
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id, shift_id, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi, branch_id,
      epf_number, epf_amount, esi_number, esi_amount, payment_mode
    } = req.body;

    if (!employee_number) {
      employee_number = await getNextEmployeeNumber(db);
    }

    const result = await db.query(`
      INSERT INTO employees (
        name, email, employee_number, designation, package_ctc, work_type, joining_date,
        department_id, shift_id, phone, address, pan_number, aadhar_number,
        bank_name, bank_account_number, bank_ifsc, bank_branch,
        has_epf, has_pt, has_esi, branch_id,
        epf_number, epf_amount, esi_number, esi_amount, payment_mode
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) RETURNING *
    `, [
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id || null, shift_id || null, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi, branch_id || null,
      epf_number || null, epf_amount || 0, esi_number || null, esi_amount || 0, payment_mode || 'Cash'
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: `Employee '${req.body.name}' already exists (Duplicate Email or Employee Number).` });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id, shift_id, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi,
      epf_number, epf_amount, esi_number, esi_amount, payment_mode
    } = req.body;

    const result = await db.query(`
      UPDATE employees SET 
        name=$1, email=$2, employee_number=$3, designation=$4, package_ctc=$5, work_type=$6, joining_date=$7,
        department_id=$8, shift_id=$9, phone=$10, address=$11, pan_number=$12, aadhar_number=$13,
        bank_name=$14, bank_account_number=$15, bank_ifsc=$16, bank_branch=$17,
        has_epf=$18, has_pt=$19, has_esi=$20,
        epf_number=$21, epf_amount=$22, esi_number=$23, esi_amount=$24, payment_mode=$25
      WHERE id=$26 RETURNING *
    `, [
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id || null, shift_id || null, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi,
      epf_number || null, epf_amount || 0, esi_number || null, esi_amount || 0, payment_mode || 'Cash',
      id
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: `Employee '${req.body.name}' already exists (Duplicate Email or Employee Number).` });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const branchId = req.query.branch_id;
    let empQuery = 'SELECT COUNT(*) FROM employees';
    let shiftQuery = 'SELECT COUNT(*) FROM shifts';
    let deptQuery = 'SELECT COUNT(*) FROM departments';
    let params = [];
    
    if (branchId) {
      empQuery += ' WHERE branch_id = $1';
      shiftQuery += ' WHERE branch_id = $1';
      deptQuery += ' WHERE branch_id = $1';
      params.push(branchId);
    }
    
    const empRes = await db.query(empQuery, params);
    const shiftRes = await db.query(shiftQuery, params);
    const deptRes = await db.query(deptQuery, params);
    
    res.json({
      total_employees: parseInt(empRes.rows[0].count),
      total_shifts: parseInt(shiftRes.rows[0].count),
      total_departments: parseInt(deptRes.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Attendance ---
app.get('/api/attendance', async (req, res) => {
  try {
    const { branch_id, date, start_date, end_date } = req.query;
    if (start_date && end_date) {
      const result = await db.query('SELECT * FROM attendance WHERE branch_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC', [branch_id, start_date, end_date]);
      return res.json(result.rows);
    }
    const result = await db.query('SELECT * FROM attendance WHERE branch_id = $1 AND date = $2', [branch_id, date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const { branch_id, date, records } = req.body;
    // records: [{ employee_id, status, ot_hours, salary_advance }]
    
    for (let r of records) {
      await db.query(`
        INSERT INTO attendance (employee_id, branch_id, date, status, ot_hours, salary_advance, other_allowance)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (employee_id, date) DO UPDATE SET 
          status = EXCLUDED.status, 
          ot_hours = EXCLUDED.ot_hours, 
          salary_advance = EXCLUDED.salary_advance,
          other_allowance = EXCLUDED.other_allowance
      `, [r.employee_id, branch_id, date, r.status, r.ot_hours || 0, r.salary_advance || 0, r.other_allowance || 0]);
    }
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Payroll Data ---
app.get('/api/payroll-data', async (req, res) => {
  try {
    const { branch_id, month } = req.query; 
    const result = await db.query(`
      SELECT 
        employee_id,
        COUNT(CASE WHEN status = 'Present' THEN 1 END)::int as present_count,
        COUNT(CASE WHEN status = 'HalfDay' THEN 1 END)::int as halfday_count,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END)::int as absent_count,
        COUNT(CASE WHEN status = 'WeekOff' THEN 1 END)::int as weekoff_count,
        COALESCE(SUM(ot_hours), 0)::int as total_ot,
        COALESCE(SUM(salary_advance), 0)::int as total_advance,
        COALESCE(SUM(other_allowance), 0)::int as total_allowance
      FROM attendance
      WHERE branch_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
      GROUP BY employee_id
    `, [branch_id, month]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Loans ---
app.get('/api/loans/state', async (req, res) => {
  try {
    const { branch_id, month } = req.query; 
    const employees = await db.query('SELECT id FROM employees WHERE branch_id = $1', [branch_id]);
    
    const events = await db.query(`
      SELECT el.* FROM employee_loans el
      JOIN employees e ON el.employee_id = e.id
      WHERE e.branch_id = $1 AND el.month <= $2
      ORDER BY el.month ASC, el.id ASC
    `, [branch_id, month]);

    const stateByEmp = {};
    employees.rows.forEach(e => {
      stateByEmp[e.id] = { outstanding: 0, currentDeduction: 0, deductionThisMonth: 0 };
    });

    if (events.rows.length === 0) return res.json(stateByEmp);
    
    let currentMonth = events.rows[0].month;
    const endMonth = month;
    
    const nextMonth = (m) => {
      let [y, mo] = m.split('-').map(Number);
      mo++;
      if (mo > 12) { mo = 1; y++; }
      return `${y}-${mo.toString().padStart(2, '0')}`;
    };

    while (currentMonth <= endMonth) {
      const monthEvents = events.rows.filter(e => e.month === currentMonth);
      monthEvents.forEach(ev => {
        if (!stateByEmp[ev.employee_id]) stateByEmp[ev.employee_id] = { outstanding: 0, currentDeduction: 0 };
        
        if (ev.type === 'TAKEN') {
          stateByEmp[ev.employee_id].outstanding += ev.amount;
        } else if (ev.type === 'DEDUCTION_SET') {
          stateByEmp[ev.employee_id].currentDeduction = ev.amount;
        }
      });
      
      if (currentMonth === endMonth) break;
      
      Object.keys(stateByEmp).forEach(empId => {
        const state = stateByEmp[empId];
        if (state.outstanding > 0 && state.currentDeduction > 0) {
          const deduction = Math.min(state.outstanding, state.currentDeduction);
          state.outstanding -= deduction;
        }
      });
      
      currentMonth = nextMonth(currentMonth);
    }
    
    Object.keys(stateByEmp).forEach(empId => {
      const state = stateByEmp[empId];
      state.deductionThisMonth = Math.min(state.outstanding, state.currentDeduction);
    });

    res.json(stateByEmp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/loans', async (req, res) => {
  try {
    const { employee_id, amount, deduction_amount, start_month } = req.body;
    const current_month = new Date().toISOString().slice(0, 7);
    
    await db.query(`
      INSERT INTO employee_loans (employee_id, type, amount, month)
      VALUES ($1, 'TAKEN', $2, $3)
    `, [employee_id, amount, current_month]);

    await db.query(`
      INSERT INTO employee_loans (employee_id, type, amount, month)
      VALUES ($1, 'DEDUCTION_SET', $2, $3)
    `, [employee_id, deduction_amount, start_month]);

    res.json({ message: 'Loan added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
