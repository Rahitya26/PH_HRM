import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { Edit2, X, Briefcase, Mail, Phone, MapPin, Check, ChevronRight, User, Users, Calendar, Trash2 } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loanState, setLoanState] = useState({});
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 24;

  const { selectedBranch } = useContext(BranchContext);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const empRes = await axios.get(`/api/employees?branch_id=${selectedBranch}`);
      setEmployees(empRes.data);
      const deptRes = await axios.get(`/api/departments?branch_id=${selectedBranch}`);
      setDepartments(deptRes.data);
      const shiftRes = await axios.get(`/api/shifts?branch_id=${selectedBranch}`);
      setShifts(shiftRes.data);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const loanRes = await axios.get(`/api/loans/state?branch_id=${selectedBranch}&month=${currentMonth}`);
      setLoanState(loanRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchData();
    }
  }, [selectedBranch]);

  const handleCardClick = (emp) => {
    setSelectedEmp(emp);
    
    // Format the date so it displays correctly in the edit form
    const formattedData = { ...emp };
    if (formattedData.joining_date) {
      formattedData.joining_date = formattedData.joining_date.split('T')[0];
    }
    
    const empLoan = loanState[emp.id] || { outstanding: 0, currentDeduction: 0 };
    formattedData.loan_outstanding = empLoan.outstanding;
    formattedData.loan_deduction = empLoan.currentDeduction;
    
    setFormData(formattedData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      await axios.put(`/api/employees/${selectedEmp.id}`, formData);
      
      // Handle loan changes
      const empLoan = loanState[selectedEmp.id] || { outstanding: 0, currentDeduction: 0 };
      const newOutstanding = parseInt(formData.loan_outstanding) || 0;
      const newDeduction = parseInt(formData.loan_deduction) || 0;
      
      if (newOutstanding !== empLoan.outstanding || newDeduction !== empLoan.currentDeduction) {
         const amountDiff = newOutstanding - empLoan.outstanding;
         await axios.post('/api/loans', {
           employee_id: selectedEmp.id,
           amount: amountDiff,
           deduction_amount: newDeduction,
           start_month: new Date().toISOString().slice(0, 7)
         });
      }

      setIsEditing(false);
      fetchData();
      setSelectedEmp({
        ...formData, 
        department_name: departments.find(d => d.id == formData.department_id)?.name, 
        shift_name: shifts.find(s => s.id == formData.shift_id)?.name
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update employee details');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (val) => {
    if (!val) return '0';
    return new Intl.NumberFormat('en-IN').format(val);
  };

  const handleDeleteClick = (e, emp) => {
    e.stopPropagation();
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await axios.delete(`/api/employees/${employeeToDelete.id}`);
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      if (selectedEmp?.id === employeeToDelete.id) {
        setSelectedEmp(null);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (emp.employee_number && emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDept ? emp.department_id === parseInt(filterDept) : true;
    return matchesSearch && matchesDept;
  });

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDept]);

  const inputCls = "w-full border-2 border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all bg-slate-50 focus:bg-white";

  return (
    <>
      <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Employees</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Directory of all active personnel.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none w-full sm:w-64"
          />
          <select 
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
            className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none"
          >
            <option value="">All Departments</option>
            {[...departments].sort((a, b) => a.name.localeCompare(b.name)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-extrabold text-slate-700 tracking-tight">Loading Directory...</h3>
          <p className="text-sm font-medium text-slate-500 max-w-sm mt-1">Please wait while we securely fetch the employee records.</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Users size={32} className="text-slate-300" strokeWidth={2} />
          </div>
          <h3 className="text-xl font-extrabold text-slate-700 mb-2 tracking-tight">No Employees Found</h3>
          <p className="text-sm font-medium text-slate-500 max-w-sm">
            This branch currently has no employees. Head over to the Onboarding section to start building your team.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {paginatedEmployees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => handleCardClick(emp)}
                className="group relative bg-white rounded-xl p-3 md:p-4 cursor-pointer border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden flex flex-col items-center text-center"
              >
                <button 
                  onClick={(e) => handleDeleteClick(e, emp)}
                  className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-6 h-6 md:w-8 md:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-200"
                >
                  <Trash2 size={14} className="w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={2.5} />
                </button>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative mb-2 md:mb-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-tr from-indigo-100 to-purple-50 text-indigo-600 rounded-full flex items-center justify-center text-base md:text-lg font-black shadow-inner border border-white">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                
                <h3 className="text-xs md:text-sm font-bold text-slate-800 truncate w-full">{emp.name}</h3>
                <p className="text-[10px] md:text-[11px] font-semibold text-slate-400 mt-0.5 truncate w-full">{emp.designation || 'No Designation'}</p>
                
                <div className="mt-2 md:mt-3 w-full pt-2 md:pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-100 text-slate-600 text-[8px] md:text-[9px] font-bold rounded md:rounded-md flex-1 truncate text-left mr-1 md:mr-0 max-w-[100px]">
                    {emp.department_name || 'No Dept'}
                  </span>
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded md:rounded-full flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <ChevronRight className="w-3 h-3 md:w-3.5 md:h-3.5" strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 mt-6 shadow-sm">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700 font-medium">
                    Showing <span className="font-bold text-indigo-600">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="font-bold text-indigo-600">{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)}</span> of <span className="font-bold">{filteredEmployees.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px bg-white" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-white text-sm font-bold text-slate-700">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
              
              {/* Mobile pagination controls */}
              <div className="flex items-center justify-between w-full sm:hidden">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {selectedEmp && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ position: 'fixed' }}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEmp(null)}></div>
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg font-black">
                  {selectedEmp.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Profile' : selectedEmp.name}</h2>
                  {!isEditing && <p className="text-xs font-semibold text-slate-500">{selectedEmp.designation}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing && (
                  <>
                    <button onClick={() => { setEmployeeToDelete(selectedEmp); setShowDeleteConfirm(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm rounded-lg text-[13px] font-bold transition-all">
                      <Trash2 size={14} /> Delete
                    </button>
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm rounded-lg text-[13px] font-bold transition-all">
                      <Edit2 size={14} /> Edit Details
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedEmp(null)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-visible flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                
                {/* Column 1 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                      <User className="text-indigo-500" size={18} /> Professional Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Employee Number</label>
                        <div className="font-semibold text-slate-800 text-sm">{selectedEmp.employee_number || '—'}</div>
                      </div>
                      
                      {['name', 'email', 'designation'].map(field => (
                        <div key={field}>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{field}</label>
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={formData[field] || ''} 
                              onChange={e => setFormData({...formData, [field]: e.target.value})} 
                              className={inputCls} 
                            />
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp[field] || '—'}</div>
                          )}
                        </div>
                      ))}

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Package CTC</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={formData.package_ctc || ''} 
                            onChange={e => setFormData({...formData, package_ctc: e.target.value.replace(/[^0-9]/g, '')})} 
                            className={inputCls} 
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 text-sm">{selectedEmp.package_ctc ? `₹${formatCurrency(selectedEmp.package_ctc)}` : '—'}</div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Joining Date</label>
                        {isEditing ? (
                          <input 
                            type="date" 
                            value={formData.joining_date || ''} 
                            onChange={e => setFormData({...formData, joining_date: e.target.value})} 
                            className={inputCls} 
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" /> {formatDate(selectedEmp.joining_date)}
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Department</label>
                          {isEditing ? (
                            <select value={formData.department_id || ''} onChange={e => setFormData({...formData, department_id: e.target.value})} className={inputCls}>
                              <option value="">— Select —</option>
                              {[...departments].sort((a, b) => a.name.localeCompare(b.name)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.department_name || '—'}</div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Shift</label>
                          {isEditing ? (
                            <select value={formData.shift_id || ''} onChange={e => setFormData({...formData, shift_id: e.target.value})} className={inputCls}>
                              <option value="">— Select —</option>
                              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.shift_name || '—'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4">
                      <Briefcase className="text-emerald-500" size={18} /> Identity & Contact
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone</label>
                          {isEditing ? (
                            <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputCls} />
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.phone || '—'}</div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">PAN Number</label>
                          {isEditing ? (
                            <input type="text" value={formData.pan_number || ''} onChange={e => setFormData({...formData, pan_number: e.target.value})} className={inputCls} />
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.pan_number || '—'}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Aadhar Number</label>
                          {isEditing ? (
                            <input type="text" value={formData.aadhar_number || ''} onChange={e => setFormData({...formData, aadhar_number: e.target.value})} className={inputCls} />
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.aadhar_number || '—'}</div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Mode of Payment</label>
                          {isEditing ? (
                            <select value={formData.payment_mode || 'Cash'} onChange={e => setFormData({...formData, payment_mode: e.target.value})} className={inputCls}>
                              <option value="Cash">Cash</option>
                              <option value="Bank">Bank</option>
                            </select>
                          ) : (
                            <div className="font-semibold text-slate-800 text-sm">{selectedEmp.payment_mode || 'Cash'}</div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">Bank Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Bank Name</label>
                            {isEditing ? <input type="text" value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.bank_name || '—'}</div>}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">IFSC</label>
                            {isEditing ? <input type="text" value={formData.bank_ifsc || ''} onChange={e => setFormData({...formData, bank_ifsc: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.bank_ifsc || '—'}</div>}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Branch Name</label>
                            {isEditing ? <input type="text" value={formData.bank_branch || ''} onChange={e => setFormData({...formData, bank_branch: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.bank_branch || '—'}</div>}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Account Number</label>
                            {isEditing ? <input type="text" value={formData.bank_account_number || ''} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.bank_account_number || '—'}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">Loan Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Outstanding Loan (₹)</label>
                            {isEditing ? <input type="text" value={formData.loan_outstanding || ''} onChange={e => setFormData({...formData, loan_outstanding: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">₹{loanState[selectedEmp.id]?.outstanding || 0}</div>}
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Deduction / Mo (₹)</label>
                            {isEditing ? <input type="text" value={formData.loan_deduction || ''} onChange={e => setFormData({...formData, loan_deduction: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">₹{loanState[selectedEmp.id]?.currentDeduction || 0}</div>}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Payroll Deductions</h4>
                        
                        {/* EPF Section */}
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer group mb-2">
                            {isEditing ? (
                              <input 
                                type="checkbox" 
                                checked={formData.has_epf || false} 
                                onChange={e => setFormData({...formData, has_epf: e.target.checked})} 
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors" 
                              />
                            ) : (
                              <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors ${selectedEmp.has_epf ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                                {selectedEmp.has_epf && <Check size={12} strokeWidth={3} />}
                              </div>
                            )}
                            <span className={`text-xs font-bold uppercase tracking-wide ${selectedEmp.has_epf || isEditing ? 'text-slate-800' : 'text-slate-400'}`}>
                              Enable EPF
                            </span>
                          </label>

                          {(isEditing ? formData.has_epf : selectedEmp.has_epf) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">UAN Number</label>
                                {isEditing ? <input type="text" value={formData.epf_number || ''} onChange={e => setFormData({...formData, epf_number: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.epf_number || '—'}</div>}
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">EPF Amount (₹)</label>
                                {isEditing ? <input type="text" value={formData.epf_amount || ''} onChange={e => setFormData({...formData, epf_amount: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">₹{selectedEmp.epf_amount || 0}</div>}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ESI Section */}
                        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer group mb-2">
                            {isEditing ? (
                              <input 
                                type="checkbox" 
                                checked={formData.has_esi || false} 
                                onChange={e => setFormData({...formData, has_esi: e.target.checked})} 
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-colors" 
                              />
                            ) : (
                              <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors ${selectedEmp.has_esi ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-slate-50'}`}>
                                {selectedEmp.has_esi && <Check size={12} strokeWidth={3} />}
                              </div>
                            )}
                            <span className={`text-xs font-bold uppercase tracking-wide ${selectedEmp.has_esi || isEditing ? 'text-slate-800' : 'text-slate-400'}`}>
                              Enable ESI
                            </span>
                          </label>

                          {(isEditing ? formData.has_esi : selectedEmp.has_esi) && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">ESI Number</label>
                                {isEditing ? <input type="text" value={formData.esi_number || ''} onChange={e => setFormData({...formData, esi_number: e.target.value})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">{selectedEmp.esi_number || '—'}</div>}
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">ESI Amount (₹)</label>
                                {isEditing ? <input type="text" value={formData.esi_amount || ''} onChange={e => setFormData({...formData, esi_amount: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} /> : <div className="font-semibold text-slate-800 text-sm">₹{selectedEmp.esi_amount || 0}</div>}
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                      
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            {isEditing && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all">Save Changes</button>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Employee?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to permanently remove <strong>{employeeToDelete?.name}</strong>? This will instantly delete their attendance history, payroll records, and any active loans. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowDeleteConfirm(false); setEmployeeToDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
