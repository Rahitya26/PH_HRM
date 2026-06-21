import { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { UserPlus, Save, Check, ChevronDown, User, MapPin, Briefcase, CreditCard, Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Onboarding() {
  const [form, setForm] = useState({
    name: '', email: '', designation: '', package_ctc: '', work_type: 'Full-time', joining_date: '',
    department_id: '', shift_id: '', phone: '', address: '',
    pan_number: '', aadhar_number: '', bank_name: '', bank_account_number: '', bank_ifsc: '', bank_branch: '',
    has_epf: false, has_esi: false,
    epf_number: '', epf_amount: '', esi_number: '', esi_amount: ''
  });
  
  const [departments, setDepartments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [deptSearch, setDeptSearch] = useState('');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [success, setSuccess] = useState(false);
  const [nextEmpNumber, setNextEmpNumber] = useState('Loading...');
  
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [importMismatches, setImportMismatches] = useState([]);
  const fileInputRef = useRef(null);
  const { selectedBranch } = useContext(BranchContext);

  useEffect(() => {
    const fetchNextNumber = () => {
      axios.get('/api/employees/next-number').then(res => setNextEmpNumber(res.data.next_number)).catch(() => {});
    };

    fetchNextNumber();
    if (selectedBranch) {
      axios.get(`/api/departments?branch_id=${selectedBranch}`).then(res => setDepartments(res.data));
      axios.get(`/api/shifts?branch_id=${selectedBranch}`).then(res => setShifts(res.data));
    }
  }, [selectedBranch]);

  const formatCurrency = (val) => {
    if (!val) return '';
    const numericStr = val.toString().replace(/[^0-9]/g, '');
    if (!numericStr) return '';
    return new Intl.NumberFormat('en-IN').format(parseInt(numericStr, 10));
  };

  const handlePackageChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    setForm({...form, package_ctc: rawValue});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/employees', { ...form, branch_id: selectedBranch });
      setSuccess(true);
      setForm({
        name: '', email: '', designation: '', package_ctc: '', work_type: 'Full-time', joining_date: '',
        department_id: '', shift_id: '', phone: '', address: '', pan_number: '', aadhar_number: '',
        bank_name: '', bank_account_number: '', bank_ifsc: '', bank_branch: '', 
        has_epf: false, has_esi: false,
        epf_number: '', epf_amount: '', esi_number: '', esi_amount: ''
      });
      setDeptSearch('');
      axios.get('/api/employees/next-number').then(res => setNextEmpNumber(res.data.next_number)).catch(() => {});
    } catch (err) {
      console.error(err);
      alert('Failed to onboard employee');
    }
  };

  const handleDownloadFormat = () => {
    const headers = [
      "Employee Number", "Full Name", "Email Address", "Designation", "Package", 
      "Work Type", "Joining Date", "Department Name", "Shift Name", 
      "Phone Number", "Address", "PAN Number", "Aadhar Number", 
      "Bank Name", "Account Number", "IFSC", "Branch", 
      "EPF (Yes/No)", "PT (Yes/No)", "ESI (Yes/No)"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(15, h.length + 5) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Format");
    XLSX.writeFile(wb, "bulk_onboard_format.xlsx");
    setShowBulkDropdown(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      
      let mismatches = [];
      const defaultShift = shifts.find(s => s.is_default) || shifts[0];
      
      for(let row of json) {
        let dept_id = null;
        let shift_id = defaultShift?.id || null;
        let mismatchMsg = [];
        
        const normalizeWorkType = (val) => {
          if (!val) return 'Full-time';
          const v = val.toString().toLowerCase().replace(/[^a-z]/g, '');
          if (v.includes('part')) return 'Part-time';
          if (v.includes('intern')) return 'Intern';
          return 'Full-time';
        };

        let parsedJoiningDate = new Date().toISOString().split('T')[0];
        let rawDate = row["Joining Date"];
        if (rawDate) {
          if (typeof rawDate === 'number') {
            // Excel serial date to YYYY-MM-DD
            const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            if (!isNaN(dateObj.getTime())) parsedJoiningDate = dateObj.toISOString().split('T')[0];
          } else if (typeof rawDate === 'string') {
            // Parse DD/MM/YYYY or DD-MM-YYYY
            const parts = rawDate.split(/[\/\-]/);
            if (parts.length === 3) {
              let day = parts[0].padStart(2, '0');
              let month = parts[1].padStart(2, '0');
              let year = parts[2];
              if (year.length === 2) year = "20" + year;
              parsedJoiningDate = `${year}-${month}-${day}`;
            }
          }
        }
        
        const normalizeName = (str) => str ? str.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        
        if(row["Department Name"]) {
          const rowDept = normalizeName(row["Department Name"]);
          const d = departments.find(d => normalizeName(d.name) === rowDept || normalizeName(d.name).includes(rowDept));
          if(d) dept_id = d.id;
          else mismatchMsg.push(`Department '${row["Department Name"]}' not found. Assigned to NA/empty.`);
        }
        
        if(row["Shift Name"]) {
          const rowShift = normalizeName(row["Shift Name"]);
          const s = shifts.find(s => normalizeName(s.name) === rowShift || normalizeName(s.name).includes(rowShift));
          if(s) shift_id = s.id;
          else mismatchMsg.push(`Shift '${row["Shift Name"]}' not found. Assigned to default shift.`);
        } else {
           mismatchMsg.push(`No shift provided. Assigned to default shift.`);
        }
        
        const payload = {
          name: row["Full Name"] || '',
          email: row["Email Address"] || '',
          employee_number: row["Employee Number"]?.toString() || '',
          designation: row["Designation"] || '',
          package_ctc: row["Package"] ? row["Package"].toString().replace(/[^0-9]/g, '') : 0,
          work_type: normalizeWorkType(row["Work Type"]),
          joining_date: parsedJoiningDate,
          department_id: dept_id,
          shift_id: shift_id,
          phone: row["Phone Number"] || '',
          address: row["Address"] || '',
          pan_number: row["PAN Number"] || '',
          aadhar_number: row["Aadhar Number"] || '',
          bank_name: row["Bank Name"] || '',
          bank_account_number: row["Account Number"] || '',
          bank_ifsc: row["IFSC"] || '',
          bank_branch: row["Branch"] || '',
          has_epf: row["EPF (Yes/No)"]?.toLowerCase() === 'yes',
          has_esi: row["ESI (Yes/No)"]?.toLowerCase() === 'yes',
          epf_number: row["UAN Number"] || '',
          epf_amount: row["EPF Amount"] ? parseInt(row["EPF Amount"].toString().replace(/[^0-9]/g, ''), 10) : 0,
          esi_number: row["ESI Number"] || '',
          esi_amount: row["ESI Amount"] ? parseInt(row["ESI Amount"].toString().replace(/[^0-9]/g, ''), 10) : 0,
          branch_id: selectedBranch
        };

        try {
          await axios.post('/api/employees', payload);
          
          // Only log department/shift mismatches if the employee was successfully inserted
          if(mismatchMsg.length > 0) {
            mismatches.push({ name: row["Full Name"] || 'Unknown Employee', messages: mismatchMsg });
          }
        } catch(err) {
          mismatches.push({ name: row["Full Name"] || 'Unknown Employee', messages: ["Failed to insert record: " + (err.response?.data?.error || err.message)]});
        }
      }
      
      fileInputRef.current.value = "";
      setShowBulkDropdown(false);
      setImportMismatches(mismatches);
      setShowMismatchModal(true);
    };
    reader.readAsBinaryString(file);
  };

  const filteredDepts = departments.filter(d => d.name.toLowerCase().includes(deptSearch.toLowerCase()));
  const selectedDept = departments.find(d => d.id === form.department_id);

  const SectionTitle = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
    </div>
  );

  const inputCls = "w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all shadow-sm";

  return (
    <>
      {/* Success Modal */}
      {success && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center backdrop-blur-md bg-white/10 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Employee Onboarded!</h2>
            <p className="text-slate-500 mb-6 font-medium text-sm">The new employee has been added to the system successfully.</p>
            <button onClick={() => setSuccess(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors">Close</button>
          </div>
        </div>,
        document.body
      )}

      {/* Mismatch Modal */}
      {showMismatchModal && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center backdrop-blur-md bg-white/10 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Bulk Import Completed</h2>
            <p className="text-slate-500 mb-4 text-sm font-medium">
              Upload finished. {importMismatches.length === 0 ? 'All records processed cleanly!' : `We found ${importMismatches.length} records with issues or missing data.`}
            </p>
            
            {importMismatches.length > 0 && (
              <div className="flex-1 overflow-y-auto mb-4 bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-4">
                {importMismatches.map((m, i) => (
                  <div key={i} className="text-sm">
                    <strong className="text-slate-800 block mb-1">{m.name}</strong>
                    <ul className="list-disc pl-5 text-orange-700 mt-1 space-y-1">
                      {m.messages.map((msg, j) => <li key={j}>{msg}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            
            <button onClick={() => setShowMismatchModal(false)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors mt-auto">Acknowledge & Close</button>
          </div>
        </div>,
        document.body
      )}

      <div className="w-full max-w-7xl mx-auto pb-8 animate-fade-up relative">

      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Onboarding</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Add a new team member to the portal.</p>
        </div>
        
        {/* Bulk Import Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowBulkDropdown(!showBulkDropdown)} 
            className="bg-white border-2 border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-bold text-sm hover:border-slate-300 transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} />
            Bulk Import
            <ChevronDown size={14} className={`transition-transform ${showBulkDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showBulkDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden z-10 animate-in slide-in-from-top-2 duration-200">
              <button 
                onClick={handleDownloadFormat}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-700 transition-colors border-b border-slate-100"
              >
                <Download size={14} className="text-slate-400" /> Download Format
              </button>
              <label className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-bold text-slate-700 transition-colors cursor-pointer">
                <Upload size={14} className="text-slate-400" /> Bulk Upload
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 space-y-10">
        
        {/* Basic Info */}
        <section>
          <SectionTitle icon={User} title="Basic Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Employee Number</label>
              <div className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-500 cursor-not-allowed">
                {nextEmpNumber}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="e.g. Rahul Sharma" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} placeholder="e.g. rahul@company.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Designation</label>
              <input type="text" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} className={inputCls} placeholder="e.g. Senior Developer" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Package / CTC (₹)</label>
              <input 
                type="text" 
                value={formatCurrency(form.package_ctc)} 
                onChange={handlePackageChange} 
                className={inputCls} 
                placeholder="e.g. 12,00,000" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Work Type</label>
              <select value={form.work_type} onChange={e => setForm({...form, work_type: e.target.value})} className={inputCls}>
                <option>Full-time</option><option>Part-time</option><option>Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Joining Date</label>
              <input type="date" value={form.joining_date} onChange={e => setForm({...form, joining_date: e.target.value})} className={inputCls} />
            </div>
          </div>
        </section>

        {/* Assignment */}
        <section>
          <SectionTitle icon={Briefcase} title="Assignment & Shift" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search department..." 
                  value={showDeptDropdown ? deptSearch : (selectedDept?.name || '')}
                  onChange={e => {
                    setDeptSearch(e.target.value);
                    setShowDeptDropdown(true);
                    setForm({...form, department_id: ''});
                  }}
                  onFocus={() => { setShowDeptDropdown(true); setDeptSearch(''); }}
                  className={inputCls} 
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
              
              {showDeptDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl shadow-slate-200 max-h-56 overflow-y-auto">
                  {filteredDepts.length > 0 ? filteredDepts.map(d => (
                    <div 
                      key={d.id} 
                      className="px-5 py-3 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer text-sm font-semibold text-slate-700 transition-colors"
                      onClick={() => { setForm({...form, department_id: d.id}); setShowDeptDropdown(false); }}
                    >
                      {d.name}
                    </div>
                  )) : (
                    <div className="px-5 py-3 text-sm font-medium text-slate-400">No departments found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assign Shift</label>
              <select value={form.shift_id} onChange={e => setForm({...form, shift_id: e.target.value})} className={inputCls}>
                <option value="">— Select a Shift —</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0,5)} - {s.end_time.substring(0,5)})</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Identity & Bank Info */}
        <section>
          <SectionTitle icon={CreditCard} title="Identity & Bank Information" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PAN Card Number</label>
              <input type="text" value={form.pan_number} onChange={e => setForm({...form, pan_number: e.target.value})} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Residential Address</label>
              <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aadhar Number</label>
              <input type="text" value={form.aadhar_number} onChange={e => setForm({...form, aadhar_number: e.target.value})} className={inputCls} />
            </div>
            <div className="col-span-1"></div>

            <div className="md:col-span-2 bg-slate-50 rounded-2xl p-6 border-2 border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 mb-4">Bank Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bank Name</label><input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} className={inputCls} /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IFSC Code</label><input type="text" value={form.bank_ifsc} onChange={e => setForm({...form, bank_ifsc: e.target.value})} className={inputCls} /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Account Number</label><input type="text" value={form.bank_account_number} onChange={e => setForm({...form, bank_account_number: e.target.value})} className={inputCls} /></div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch</label><input type="text" value={form.bank_branch} onChange={e => setForm({...form, bank_branch: e.target.value})} className={inputCls} /></div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-indigo-50/50 rounded-2xl p-6 border-2 border-indigo-50">
            <label className="block text-sm font-extrabold text-indigo-900 mb-4">Payroll Deductions</label>
            <div className="flex flex-col gap-6">
              
              {/* EPF Section */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer group w-fit mb-4">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={form.has_epf} 
                      onChange={e => setForm({...form, has_epf: e.target.checked})} 
                      className="peer appearance-none w-6 h-6 rounded-lg border-2 border-indigo-200 checked:bg-indigo-600 checked:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all cursor-pointer" 
                    />
                    <Check size={16} strokeWidth={3} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Enable EPF</span>
                </label>
                
                {form.has_epf && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">UAN Number</label>
                      <input type="text" value={form.epf_number} onChange={e => setForm({...form, epf_number: e.target.value})} className={inputCls} placeholder="e.g. 100904319456" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly EPF Amount (₹)</label>
                      <input type="text" value={form.epf_amount} onChange={e => setForm({...form, epf_amount: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} placeholder="e.g. 1800" />
                    </div>
                  </div>
                )}
              </div>

              {/* ESI Section */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer group w-fit mb-4">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={form.has_esi} 
                      onChange={e => setForm({...form, has_esi: e.target.checked})} 
                      className="peer appearance-none w-6 h-6 rounded-lg border-2 border-indigo-200 checked:bg-indigo-600 checked:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all cursor-pointer" 
                    />
                    <Check size={16} strokeWidth={3} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Enable ESI</span>
                </label>
                
                {form.has_esi && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ESI Number</label>
                      <input type="text" value={form.esi_number} onChange={e => setForm({...form, esi_number: e.target.value})} className={inputCls} placeholder="e.g. 31000000000000" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly ESI Amount (₹)</label>
                      <input type="text" value={form.esi_amount} onChange={e => setForm({...form, esi_amount: e.target.value.replace(/[^0-9]/g, '')})} className={inputCls} placeholder="e.g. 250" />
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-bold text-base hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/30">
            <UserPlus size={18} />
            Complete Onboarding
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
