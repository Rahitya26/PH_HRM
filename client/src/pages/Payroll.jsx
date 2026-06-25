import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { Settings, Download, CheckCircle2, XCircle, Calculator, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Payroll() {
  const { selectedBranch } = useContext(BranchContext);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [payrollData, setPayrollData] = useState([]);
  const [loanState, setLoanState] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState({});

  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (selectedBranch) {
      setIsLoading(true);
      Promise.all([
        axios.get(`/api/employees?branch_id=${selectedBranch}`),
        axios.get(`/api/departments?branch_id=${selectedBranch}`),
        axios.get(`/api/payroll-data?branch_id=${selectedBranch}&month=${selectedMonth}`),
        axios.get(`/api/loans/state?branch_id=${selectedBranch}&month=${selectedMonth}`)
      ]).then(([empRes, deptRes, payRes, loanRes]) => {
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
        setPayrollData(payRes.data);
        setLoanState(loanRes.data);
      }).catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [selectedBranch, selectedMonth]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatInputCurrency = (val) => {
    if (val === 0 || val === '0') return '0';
    if (!val) return '';
    const numericStr = val.toString().replace(/[^0-9]/g, '');
    if (!numericStr) return '';
    return new Intl.NumberFormat('en-IN').format(parseInt(numericStr, 10));
  };

  const getPayrollDetails = (emp) => {
    const record = payrollData.find(r => r.employee_id === emp.id) || {
      present_count: 0, halfday_count: 0, absent_count: 0, weekoff_count: 0, total_ot: 0, total_advance: 0, total_allowance: 0
    };

    const ctc = Number(emp.package_ctc) || 0;
    const monthlyGross = ctc / 12;

    const [yyyy, mm] = selectedMonth.split('-');
    const daysInMonth = new Date(yyyy, mm, 0).getDate();

    const dailyWage = monthlyGross / daysInMonth;
    const hourlyWage = dailyWage / 9;

    const allowedWeekOffs = Math.min(4, record.weekoff_count);
    const payableDays = record.present_count + (record.halfday_count * 0.5) + allowedWeekOffs;

    const earningSalary = payableDays * dailyWage;
    const otEarnings = record.total_ot * hourlyWage;
    const otherAllowances = record.total_allowance || 0;

    const lState = loanState[emp.id] || { outstanding: 0, deductionThisMonth: 0 };
    const outstandingLoan = lState.outstanding;
    const loanDeduction = lState.deductionThisMonth;

    const epfDeduction = emp.has_epf ? (emp.epf_amount || 0) : 0;
    const esiDeduction = emp.has_esi ? (emp.esi_amount || 0) : 0;
    
    let ptDeduction = 0;
    if (earningSalary > 20000) {
      ptDeduction = 200;
    } else if (earningSalary >= 15001) {
      ptDeduction = 150;
    }

    let deductionsTotal = record.total_advance + loanDeduction + epfDeduction + esiDeduction + ptDeduction;
    const takeHandSalary = (earningSalary + otEarnings + otherAllowances) - deductionsTotal;

    return {
      monthlyGross,
      payableDays,
      earningSalary,
      otHours: record.total_ot,
      otEarnings,
      otherAllowances,
      outstandingLoan,
      loanDeduction,
      salaryAdvance: record.total_advance,
      takeHandSalary: Math.max(0, takeHandSalary),
      epf: epfDeduction,
      pt: ptDeduction,
      esi: esiDeduction,
    };
  };

  const filteredEmployees = selectedDept 
    ? employees.filter(e => e.department_id == selectedDept)
    : employees;
    
  const sortedDepartments = [...departments].sort((a, b) => a.name.localeCompare(b.name));

  const handleDownloadExcel = () => {
    const data = filteredEmployees.map(emp => {
      const p = getPayrollDetails(emp);
      return {
        "Employee Number": emp.employee_number || 'NA',
        "Employee Name": emp.name,
        "Employee Department": emp.department_name || 'NA',
        "Gross Salary (Reference)": Math.round(p.monthlyGross),
        "Days Present": p.payableDays,
        "Earning Salary": Math.round(p.earningSalary),
        "OT Hours": p.otHours,
        "OT Earnings": Math.round(p.otEarnings),
        "Other Allowances": Math.round(p.otherAllowances),
        "Outstanding Loan": Math.round(p.outstandingLoan),
        "Loan Deduction": Math.round(p.loanDeduction),
        "Salary Advance Deduction": Math.round(p.salaryAdvance),
        "EPF Deduction": p.epf,
        "PT Deduction": p.pt,
        "ESI Deduction": p.esi,
        "Take Hand Salary": Math.round(p.takeHandSalary)
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Sheet");
    XLSX.writeFile(wb, `payroll_${selectedMonth}.xlsx`);
  };

  return (
    <div className="w-full px-4 sm:px-8 mx-auto pb-8 animate-fade-up relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Payroll Management</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Review and calculate monthly salaries based on dynamic deductions.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white border-2 border-slate-200 text-slate-700 focus:border-indigo-500 px-4 py-2.5 rounded-xl font-bold text-sm transition-all outline-none"
          >
            <option value="">All Departments</option>
            {sortedDepartments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border-2 border-slate-200 text-slate-700 focus:border-indigo-500 px-4 py-2.5 rounded-xl font-bold text-sm transition-all outline-none"
          />
          
          <button 
            onClick={handleDownloadExcel}
            className="bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            Download Salary Sheet
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-extrabold text-slate-700 tracking-tight">Loading Payroll Data...</h3>
          <p className="text-sm font-medium text-slate-500 max-w-sm mt-1">Please wait while we crunch the numbers.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Employee Name</th>
                <th className="py-5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Gross Salary</th>
                <th className="py-5 px-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-center">Earning Salary</th>
                <th className="py-5 px-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-center">OT Earnings</th>
                <th className="py-5 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Outstanding Loan</th>
                <th className="py-5 px-4 text-xs font-bold text-red-500 uppercase tracking-wider text-center">Salary Advance</th>
                <th className="py-5 px-4 text-xs font-bold text-red-500 uppercase tracking-wider text-center">Loan Deduction</th>
                <th className="py-5 px-4 text-xs font-bold text-red-500 uppercase tracking-wider text-center">Other Deductions</th>
                <th className="py-5 px-6 text-xs font-bold text-slate-800 uppercase tracking-wider text-right bg-indigo-50/30">Take Hand Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
                const p = getPayrollDetails(emp);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                        <span className="text-xs font-medium text-slate-400 mt-0.5">{emp.department_name || 'NA'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-600">
                      {formatCurrency(p.monthlyGross)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-emerald-600 font-bold">{formatCurrency(p.earningSalary)}</div>
                      <div className="text-[10px] font-semibold text-emerald-500/70">({p.payableDays} days)</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-emerald-600 font-bold">{formatCurrency(p.otEarnings)}</div>
                      <div className="text-[10px] font-semibold text-emerald-500/70">({p.otHours} hrs)</div>
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-600">
                      {formatCurrency(p.outstandingLoan)}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-red-500">
                      {p.salaryAdvance > 0 ? `-${formatCurrency(p.salaryAdvance)}` : '0'}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-red-500">
                      {p.loanDeduction > 0 ? `-${formatCurrency(p.loanDeduction)}` : '0'}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-red-500 group/tt relative cursor-help">
                      {(p.epf + p.esi + p.pt) > 0 ? `-${formatCurrency(p.epf + p.esi + p.pt)}` : '0'}
                      {(p.epf + p.esi + p.pt) > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tt:block w-32 bg-slate-800 text-white text-[10px] rounded p-2 shadow-lg z-10 text-left">
                          {p.epf > 0 && <div className="flex justify-between mb-1"><span>EPF:</span><span>₹{p.epf}</span></div>}
                          {p.esi > 0 && <div className="flex justify-between mb-1"><span>ESI:</span><span>₹{p.esi}</span></div>}
                          {p.pt > 0 && <div className="flex justify-between"><span>PT:</span><span>₹{p.pt}</span></div>}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right font-extrabold text-slate-900 bg-indigo-50/30 text-lg">
                      {formatCurrency(p.takeHandSalary)}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 font-medium">
                    No employees found. Onboard someone to view payroll.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
            const p = getPayrollDetails(emp);
            const isExpanded = !!expandedCards[emp.id];
            
            return (
              <div key={emp.id} className="p-3 bg-white">
                <div 
                  className="flex justify-between items-center cursor-pointer pb-2"
                  onClick={() => toggleCard(emp.id)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <span className="font-extrabold text-slate-800 text-sm block leading-tight truncate">{emp.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 truncate block">{emp.department_name || 'NA'}</span>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Take Hand</span>
                      <span className="font-black text-indigo-600 text-sm">{formatCurrency(p.takeHandSalary)}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-100 space-y-2 mt-2 animate-fade-up">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Gross Salary</span>
                        <span className="font-bold text-slate-600 text-xs">{formatCurrency(p.monthlyGross)}</span>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-lg p-2">
                        <span className="text-[9px] font-black text-emerald-600/70 uppercase tracking-wider block mb-0.5">Earning Salary</span>
                        <div className="text-emerald-700 font-extrabold text-xs">{formatCurrency(p.earningSalary)}</div>
                        <div className="text-[8px] font-bold text-emerald-600/70 mt-0.5">({p.payableDays} days)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-lg p-2">
                        <span className="text-[9px] font-black text-emerald-600/70 uppercase tracking-wider block mb-0.5">OT Earnings</span>
                        <div className="text-emerald-700 font-extrabold text-xs">{formatCurrency(p.otEarnings)}</div>
                        <div className="text-[8px] font-bold text-emerald-600/70 mt-0.5">({p.otHours} hrs)</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Outstand. Loan</span>
                        <span className="font-bold text-slate-600 text-xs">{formatCurrency(p.outstandingLoan)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-red-50/50 border border-red-100/50 rounded-lg p-2">
                      <div>
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-wider block mb-0.5">Advance</span>
                        <span className="font-extrabold text-red-600 text-[10px]">{p.salaryAdvance > 0 ? `-${formatCurrency(p.salaryAdvance)}` : '0'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-wider block mb-0.5">Loan Ded.</span>
                        <span className="font-extrabold text-red-600 text-[10px]">{p.loanDeduction > 0 ? `-${formatCurrency(p.loanDeduction)}` : '0'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-red-400 uppercase tracking-wider block mb-0.5">Other</span>
                        <span className="font-extrabold text-red-600 text-[10px]">{(p.epf + p.esi + p.pt) > 0 ? `-${formatCurrency(p.epf + p.esi + p.pt)}` : '0'}</span>
                        {(p.epf + p.esi + p.pt) > 0 && (
                          <div className="text-[7px] text-red-500 font-bold mt-1 leading-tight">
                            {p.epf > 0 && <div>EPF: ₹{p.epf}</div>}
                            {p.esi > 0 && <div>ESI: ₹{p.esi}</div>}
                            {p.pt > 0 && <div>PT: ₹{p.pt}</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-8 text-center text-slate-500 font-medium">
              No employees found. Onboard someone to view payroll.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
