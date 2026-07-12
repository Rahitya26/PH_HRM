const db = require('./db');

async function run() {
  try {
    const res = await db.query("SELECT id, name FROM branches WHERE name = 'KSK VENTURES MALAKPET'");
    if (res.rows.length === 0) {
      console.log("Branch 'KSK VENTURES MALAKPET' not found.");
      process.exit(1);
    }
    const branchId = res.rows[0].id;
    console.log("Found branch_id for KSK VENTURES MALAKPET:", branchId);
    
    const delRes = await db.query("DELETE FROM attendance WHERE branch_id != $1 OR branch_id IS NULL", [branchId]);
    console.log(`Deleted ${delRes.rowCount} attendance records from other branches.`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
