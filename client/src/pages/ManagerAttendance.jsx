import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Calendar, Building2, Save, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ManagerAttendance() {
  const { user, logout } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  
  const [records, setRecords] = useState({});
  const [initialRecords, setInitialRecords] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submittedEmployees, setSubmittedEmployees] = useState(new Set());
  const [loanState, setLoanState] = useState({});
  const [loanModal, setLoanModal] = useState({ open: false, emp: null, amount: '', deduction: '', startMonth: '' });
  const [expandedCards, setExpandedCards] = useState({});

  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (user?.branch_id) {
      Promise.all([
        axios.get(`/api/employees?branch_id=${user.branch_id}`),
        axios.get(`/api/departments?branch_id=${user.branch_id}`)
      ]).then(([empRes, deptRes]) => {
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
      }).catch(err => console.error(err));
    }
  }, [user]);

  useEffect(() => {
    if (user?.branch_id && date) {
      setIsLoading(true);
      axios.get(`/api/attendance?branch_id=${user.branch_id}&date=${date}`)
        .then(res => {
          const fetchedRecords = {};
          const submitted = new Set();
          res.data.forEach(r => {
            submitted.add(r.employee_id);
            fetchedRecords[r.employee_id] = {
              status: r.status,
              ot_hours: r.ot_hours || '',
              salary_advance: r.salary_advance || '',
              other_allowance: r.other_allowance || ''
            };
          });
          
          // Pre-fill default state for employees not in db yet
          employees.forEach(emp => {
            if (!fetchedRecords[emp.id]) {
              fetchedRecords[emp.id] = { status: 'Present', ot_hours: '', salary_advance: '', other_allowance: '' };
            }
          });

          setRecords(fetchedRecords);
          setInitialRecords(JSON.parse(JSON.stringify(fetchedRecords)));
          setHasChanges(false);
          setSubmittedEmployees(submitted);
        })
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));

      axios.get(`/api/loans/state?branch_id=${user.branch_id}&month=${date.slice(0, 7)}`)
        .then(res => setLoanState(res.data))
        .catch(err => console.error(err));
    }
  }, [user, date, employees]);

  const handleRecordChange = (empId, field, value) => {
    setRecords(prev => {
      const updated = { ...prev, [empId]: { ...prev[empId], [field]: value } };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(initialRecords));
      return updated;
    });
  };

  const handleOtChange = (empId, val) => {
    let num = val.replace(/[^0-9]/g, '');
    if (num !== '') {
      num = parseInt(num);
      if (num > 12) num = 12;
    }
    handleRecordChange(empId, 'ot_hours', num);
  };

  const handleAdvanceChange = (empId, val) => {
    let num = val.replace(/[^0-9]/g, '');
    handleRecordChange(empId, 'salary_advance', num);
  };

  const handleAllowanceChange = (empId, val) => {
    let num = val.replace(/[^0-9]/g, '');
    handleRecordChange(empId, 'other_allowance', num);
  };

  const handleSave = async () => {
    try {
      const payload = {
        branch_id: user.branch_id,
        date: date,
        records: Object.keys(records)
          .filter(empId => !submittedEmployees.has(parseInt(empId)))
          .map(empId => ({
            employee_id: empId,
            status: records[empId].status,
            ot_hours: parseInt(records[empId].ot_hours) || 0,
            salary_advance: parseInt(records[empId].salary_advance) || 0,
            other_allowance: parseInt(records[empId].other_allowance) || 0
          }))
      };
      
      if (payload.records.length === 0) {
        return alert('No new attendance records to save.');
      }

      await axios.post('/api/attendance', payload);
      
      const newSubmitted = new Set(submittedEmployees);
      payload.records.forEach(r => newSubmitted.add(parseInt(r.employee_id)));
      
      setInitialRecords(JSON.parse(JSON.stringify(records)));
      setHasChanges(false);
      setSubmittedEmployees(newSubmitted);
      alert('Attendance saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance');
    }
  };

  const openLoanModal = (emp) => {
    const st = loanState[emp.id] || { outstanding: 0, currentDeduction: 0 };
    setLoanModal({ 
      open: true, 
      emp, 
      amount: '', 
      deduction: st.currentDeduction || '', 
      startMonth: date.slice(0, 7),
      existingOutstanding: st.outstanding || 0,
      existingDeduction: st.currentDeduction || 0
    });
  };

  const handleSaveLoan = async (e) => {
    e.preventDefault();
    if (!loanModal.deduction) {
      return alert("Loan deduction amount is required!");
    }
    try {
      await axios.post('/api/loans', {
        employee_id: loanModal.emp.id,
        amount: parseInt(loanModal.amount) || 0,
        deduction_amount: parseInt(loanModal.deduction) || 0,
        start_month: loanModal.startMonth
      });
      setLoanModal({ open: false, emp: null, amount: '', deduction: '', startMonth: '' });
      axios.get(`/api/loans/state?branch_id=${user.branch_id}&month=${date.slice(0, 7)}`)
        .then(res => setLoanState(res.data));
      alert(`Loan successfully created for ${loanModal.emp.name}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save loan');
    }
  };

  const filteredEmployees = employees.filter(e => {
    const isDeptMatch = selectedDept ? e.department_id == selectedDept : true;
    const isJoined = !e.joining_date || (new Date(e.joining_date).toISOString().split('T')[0] <= date);
    return isDeptMatch && isJoined;
  });

  // Sort alphabetically
  const sortedEmployees = [...filteredEmployees].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight leading-none">
              PHV HRM
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
              <Building2 size={10} /> {user?.branch_name || 'Branch'} Portal
            </p>
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-red-600 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-up">
        
        <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">Daily Attendance</h2>
              </div>
              <p className="text-sm font-bold text-slate-500">{employees.length} Total Employees</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={14} className="text-slate-400" />
              </div>
              <input 
                type="date" 
                max={today}
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors"
              />
            </div>
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-extrabold text-slate-700 tracking-tight">Loading Records...</h3>
            <p className="text-sm font-medium text-slate-500 max-w-sm mt-1">Please wait while we fetch the attendance data.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Status (P/A/W)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">OT (Hours)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">Loan</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">Other Allowance (₹)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider w-32">Salary Advance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-sm font-bold text-slate-400">No employees found.</td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp, index) => {
                      const rec = records[emp.id] || { status: 'Present', ot_hours: '', salary_advance: '', other_allowance: '' };
                      return (
                        <tr key={emp.id} className={index !== sortedEmployees.length - 1 ? "border-b border-slate-100 hover:bg-slate-50/50" : "hover:bg-slate-50/50"}>
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                            <p className="text-[11px] font-semibold text-slate-400">{emp.department_name || 'No Dept'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {['Present', 'Absent', 'WeekOff', 'HalfDay'].map(status => {
                                const labels = { Present: 'P', Absent: 'A', WeekOff: 'W', HalfDay: 'H' };
                                const colors = {
                                  Present: 'peer-checked:bg-emerald-500 peer-checked:border-emerald-500',
                                  Absent: 'peer-checked:bg-red-500 peer-checked:border-red-500',
                                  WeekOff: 'peer-checked:bg-amber-500 peer-checked:border-amber-500',
                                  HalfDay: 'peer-checked:bg-blue-500 peer-checked:border-blue-500'
                                };
                                const isEmpLocked = submittedEmployees.has(emp.id);
                                return (
                                  <label key={status} className="relative cursor-pointer group">
                                    <input 
                                      type="radio" 
                                      name={`status-${emp.id}`} 
                                      value={status}
                                      checked={rec.status === status}
                                      onChange={() => handleRecordChange(emp.id, 'status', status)}
                                      disabled={isEmpLocked}
                                      className="peer sr-only"
                                    />
                                    <div className={`w-8 h-8 rounded-lg border-2 border-slate-200 flex items-center justify-center text-xs font-black transition-all ${isEmpLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-300'} text-slate-400 peer-checked:text-white ${colors[status]}`}>
                                      {labels[status]}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text" 
                              value={rec.ot_hours} 
                              onChange={(e) => handleOtChange(emp.id, e.target.value)}
                              placeholder="0"
                              disabled={submittedEmployees.has(emp.id)}
                              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none text-center disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => openLoanModal(emp)}
                              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors whitespace-nowrap"
                            >
                              Add Loan
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text" 
                              value={rec.other_allowance} 
                              onChange={(e) => handleAllowanceChange(emp.id, e.target.value)}
                              placeholder="0"
                              disabled={submittedEmployees.has(emp.id)}
                              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none text-center disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text" 
                              value={rec.salary_advance} 
                              onChange={(e) => handleAdvanceChange(emp.id, e.target.value)}
                              placeholder="0"
                              disabled={submittedEmployees.has(emp.id)}
                              className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-sm font-bold text-slate-800 focus:border-indigo-500 outline-none text-center disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {sortedEmployees.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm font-bold text-slate-400">No employees found.</div>
              ) : (
                sortedEmployees.map((emp) => {
                  const rec = records[emp.id] || { status: 'Present', ot_hours: '', salary_advance: '', other_allowance: '' };
                  const isEmpLocked = submittedEmployees.has(emp.id);
                  const empLoan = loanState[emp.id] || { outstanding: 0 };
                  const isExpanded = !!expandedCards[emp.id];

                  return (
                    <div key={emp.id} className="p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-sm font-bold text-slate-800 leading-tight truncate">{emp.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{emp.department_name || 'No Dept'}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            {['Present', 'Absent', 'WeekOff', 'HalfDay'].map(status => {
                              const labels = { Present: 'P', Absent: 'A', WeekOff: 'W', HalfDay: 'H' };
                              const colors = {
                                Present: 'peer-checked:bg-emerald-500 peer-checked:border-emerald-500',
                                Absent: 'peer-checked:bg-red-500 peer-checked:border-red-500',
                                WeekOff: 'peer-checked:bg-amber-500 peer-checked:border-amber-500',
                                HalfDay: 'peer-checked:bg-blue-500 peer-checked:border-blue-500'
                              };
                              return (
                                <label key={status} className="relative cursor-pointer group">
                                  <input 
                                    type="radio" 
                                    name={`status-mob-${emp.id}`} 
                                    value={status}
                                    checked={rec.status === status}
                                    onChange={() => handleRecordChange(emp.id, 'status', status)}
                                    disabled={isEmpLocked}
                                    className="peer sr-only"
                                  />
                                  <div className={`w-7 h-7 rounded-md border-2 border-slate-200 flex items-center justify-center text-xs font-black transition-all ${isEmpLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-slate-300'} text-slate-400 peer-checked:text-white ${colors[status]}`}>
                                    {labels[status]}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                          
                          <button 
                            onClick={() => toggleCard(emp.id)}
                            className="w-6 h-6 ml-1 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 mt-3 space-y-3 animate-fade-up">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">OT (Hours)</p>
                              <input 
                                type="text" 
                                disabled={isEmpLocked}
                                value={rec.ot_hours} 
                                onChange={(e) => handleOtChange(emp.id, e.target.value)}
                                className={`w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 focus:border-indigo-500 outline-none transition-colors ${isEmpLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Loan</p>
                              {empLoan.outstanding > 0 ? (
                                <button disabled={isEmpLocked} onClick={() => setLoanModal({ open: true, emp, amount: empLoan.outstanding, deduction: empLoan.currentDeduction, startMonth: date.slice(0, 7) })} className={`w-full px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded-md text-xs font-bold text-indigo-700 text-left transition-colors ${isEmpLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-indigo-100 hover:border-indigo-200'}`}>
                                  ₹{empLoan.outstanding.toLocaleString('en-IN')}
                                </button>
                              ) : (
                                <button disabled={isEmpLocked} onClick={() => setLoanModal({ open: true, emp, amount: '', deduction: '', startMonth: date.slice(0, 7) })} className={`w-full px-2 py-1.5 bg-slate-50 border border-slate-200 border-dashed rounded-md text-xs font-bold text-slate-400 text-left transition-colors ${isEmpLocked ? 'cursor-not-allowed opacity-60' : 'hover:border-indigo-300 hover:text-indigo-600'}`}>
                                  + Add Loan
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Allowance (₹)</p>
                              <input 
                                type="text" 
                                disabled={isEmpLocked}
                                value={rec.other_allowance} 
                                onChange={(e) => handleAllowanceChange(emp.id, e.target.value)}
                                className={`w-full px-2 py-1.5 bg-emerald-50/50 border border-emerald-100 rounded-md text-xs font-bold text-emerald-700 focus:border-emerald-500 outline-none transition-colors ${isEmpLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Advance (₹)</p>
                              <input 
                                type="text" 
                                disabled={isEmpLocked}
                                value={rec.salary_advance} 
                                onChange={(e) => handleAdvanceChange(emp.id, e.target.value)}
                                className={`w-full px-2 py-1.5 bg-red-50/50 border border-red-100 rounded-md text-xs font-bold text-red-700 focus:border-red-500 outline-none transition-colors ${isEmpLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {employees.length > 0 && submittedEmployees.size < employees.length && createPortal(
        <div className="fixed bottom-0 left-0 w-full z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 pointer-events-none">
          <div className="max-w-xl mx-auto mb-6 px-4 pointer-events-auto">
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-700">
              <div className="text-sm font-bold">
                {hasChanges ? 'Unsaved Attendance Changes' : 'Ready to Save Attendance'}
              </div>
              <button 
                onClick={handleSave} 
                className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Attendance
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {loanModal.open && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Issue Loan</h2>
            <p className="text-sm font-bold text-slate-500 mb-6">{loanModal.emp.name}</p>
            
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 font-bold">Existing Outstanding:</span>
                <span className="text-slate-800 font-black">₹{loanModal.existingOutstanding}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold">Existing Deduction:</span>
                <span className="text-slate-800 font-black">₹{loanModal.existingDeduction}/mo</span>
              </div>
            </div>

            <form onSubmit={handleSaveLoan}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Loan Amount (₹)</label>
                  <input 
                    type="text" 
                    value={loanModal.amount} 
                    onChange={e => setLoanModal({...loanModal, amount: e.target.value.replace(/[^0-9]/g, '')})} 
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loan Deduction Per Month (₹)</label>
                  <input 
                    type="text" 
                    required
                    value={loanModal.deduction} 
                    onChange={e => setLoanModal({...loanModal, deduction: e.target.value.replace(/[^0-9]/g, '')})} 
                    placeholder="e.g. 2000"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deduction Starts From</label>
                  <input 
                    type="month" 
                    required
                    value={loanModal.startMonth} 
                    onChange={e => setLoanModal({...loanModal, startMonth: e.target.value})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none" 
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setLoanModal({open: false})} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30">Save Loan</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
