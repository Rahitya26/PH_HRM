const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');

// --- Auth ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === 'ravi' && password === 'ravi@2026') {
      return res.json({ role: 'admin', branch_name: 'Admin Dashboard' });
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
      epf_number, epf_amount, esi_number, esi_amount
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
        epf_number, epf_amount, esi_number, esi_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25) RETURNING *
    `, [
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id || null, shift_id || null, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi, branch_id || null,
      epf_number || null, epf_amount || 0, esi_number || null, esi_amount || 0
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
      epf_number, epf_amount, esi_number, esi_amount
    } = req.body;

    const result = await db.query(`
      UPDATE employees SET 
        name=$1, email=$2, employee_number=$3, designation=$4, package_ctc=$5, work_type=$6, joining_date=$7,
        department_id=$8, shift_id=$9, phone=$10, address=$11, pan_number=$12, aadhar_number=$13,
        bank_name=$14, bank_account_number=$15, bank_ifsc=$16, bank_branch=$17,
        has_epf=$18, has_pt=$19, has_esi=$20,
        epf_number=$21, epf_amount=$22, esi_number=$23, esi_amount=$24
      WHERE id=$25 RETURNING *
    `, [
      name, email, employee_number, designation, package_ctc, work_type, joining_date,
      department_id || null, shift_id || null, phone, address, pan_number, aadhar_number,
      bank_name, bank_account_number, bank_ifsc, bank_branch,
      has_epf, has_pt, has_esi,
      epf_number || null, epf_amount || 0, esi_number || null, esi_amount || 0,
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
    const { branch_id, date } = req.query;
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
