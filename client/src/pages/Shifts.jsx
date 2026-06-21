import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { Plus, Trash2, Clock, Building2, Server, Edit2 } from 'lucide-react';

export default function Shifts() {
  const [activeTab, setActiveTab] = useState('shifts');
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const initialShiftState = { name: '', start_time: '', end_time: '', is_split_shift: false, second_start_time: '', second_end_time: '' };
  const [newShift, setNewShift] = useState(initialShiftState);
  const [editingShiftId, setEditingShiftId] = useState(null);
  
  const [newDept, setNewDept] = useState('');
  const { selectedBranch } = useContext(BranchContext);

  const fetchData = async () => {
    try {
      const shiftRes = await axios.get(`http://localhost:5000/api/shifts?branch_id=${selectedBranch}`);
      setShifts(shiftRes.data);
      const deptRes = await axios.get(`http://localhost:5000/api/departments?branch_id=${selectedBranch}`);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedBranch) {
      fetchData();
    }
  }, [selectedBranch]);

  const handleEditClick = (shift) => {
    setEditingShiftId(shift.id);
    setNewShift({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      is_split_shift: shift.is_split_shift || false,
      second_start_time: shift.second_start_time || '',
      second_end_time: shift.second_end_time || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingShiftId(null);
    setNewShift(initialShiftState);
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    try {
      if (editingShiftId) {
        await axios.put(`http://localhost:5000/api/shifts/${editingShiftId}`, newShift);
      } else {
        await axios.post('http://localhost:5000/api/shifts', { ...newShift, branch_id: selectedBranch });
      }
      setNewShift(initialShiftState);
      setEditingShiftId(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save shift');
    }
  };

  const handleDeleteShift = async (id) => {
    if(!window.confirm('Delete this shift?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/shifts/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete shift');
    }
  };

  const handleAddDept = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/departments', { name: newDept, branch_id: selectedBranch });
      setNewDept('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add department');
    }
  };

  const handleDeleteDept = async (id) => {
    if(!window.confirm('Delete this department?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/departments/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete department');
    }
  };

  const inputCls = "w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all";

  return (
    <div className="space-y-8 animate-fade-up max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shifts & Departments</h1>
        <p className="text-slate-500 mt-1 font-medium text-sm">System configurations for time and organizational structures.</p>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-max">
        <button 
          onClick={() => setActiveTab('shifts')} 
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'shifts' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
        >
          <Clock size={16} /> Shift Types
        </button>
        <button 
          onClick={() => setActiveTab('departments')} 
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'departments' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
        >
          <Building2 size={16} /> Departments
        </button>
      </div>

      <div className="mt-8">
        {/* SHIFTS SECTION */}
        {activeTab === 'shifts' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleSaveShift} className="bg-gradient-to-b from-white to-slate-50 rounded-xl border-2 border-slate-100 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-base">
                <Plus className="text-purple-600" size={18} /> {editingShiftId ? 'Edit Shift' : 'Add Custom Shift'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5 items-end">
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shift Name</label>
                  <input type="text" required value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} placeholder="e.g. Night Shift" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="time" required value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
                  <input type="time" required value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} className={inputCls} />
                </div>
                
                <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer w-max">
                    <input type="checkbox" checked={newShift.is_split_shift} onChange={e => setNewShift({...newShift, is_split_shift: e.target.checked})} className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" />
                    <span className="text-sm font-bold text-slate-700">Add a break shift (Split Shift)</span>
                  </label>
                </div>

                {newShift.is_split_shift && (
                  <>
                    <div className="lg:col-start-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Second Start Time</label>
                      <input type="time" required={newShift.is_split_shift} value={newShift.second_start_time} onChange={e => setNewShift({...newShift, second_start_time: e.target.value})} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Second End Time</label>
                      <input type="time" required={newShift.is_split_shift} value={newShift.second_end_time} onChange={e => setNewShift({...newShift, second_end_time: e.target.value})} className={inputCls} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-purple-600 text-white rounded-lg px-6 py-2.5 text-sm font-bold hover:bg-purple-700 hover:shadow-lg hover:shadow-purple-500/20 transition-all flex items-center gap-2">
                  <Plus size={16} strokeWidth={3} /> {editingShiftId ? 'Save Changes' : 'Create Shift'}
                </button>
                {editingShiftId && (
                  <button type="button" onClick={handleCancelEdit} className="px-6 bg-slate-200 text-slate-700 rounded-lg py-2.5 text-sm font-bold hover:bg-slate-300 transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  Active Shifts
                </h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{shifts.length} Active</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shifts.map(s => (
                  <div key={s.id} className="group bg-white rounded-xl border-2 border-slate-100 p-4 flex justify-between items-center shadow-sm hover:border-purple-300 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-purple-500 transition-colors">
                        <Server size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-900 text-base">{s.name}</span>
                          {s.is_default && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase font-black tracking-wider border border-purple-200">Default</span>}
                        </div>
                        <p className="text-slate-500 font-medium text-[13px] flex items-center gap-1.5">
                          <Clock size={12} /> {s.start_time?.substring(0,5)} – {s.end_time?.substring(0,5)}
                          {s.is_split_shift && (
                            <>
                              <span className="text-slate-300 mx-0.5">|</span> 
                              {s.second_start_time?.substring(0,5)} – {s.second_end_time?.substring(0,5)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditClick(s)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-colors">
                        <Edit2 size={16} />
                      </button>
                      {!s.is_default && (
                        <button onClick={() => handleDeleteShift(s.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* DEPARTMENTS SECTION */}
        {activeTab === 'departments' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleAddDept} className="bg-gradient-to-b from-white to-slate-50 rounded-xl border-2 border-slate-100 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-base"><Plus className="text-emerald-600" size={18} /> Add Department</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department Name</label>
                  <input type="text" required value={newDept} onChange={e => setNewDept(e.target.value)} placeholder="e.g. Engineering, Sales..." className={inputCls} />
                </div>
                <button type="submit" className="w-full sm:w-auto bg-emerald-600 text-white rounded-lg px-6 py-2.5 text-sm font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex justify-center items-center gap-2">
                  <Plus size={16} strokeWidth={3} /> Add Department
                </button>
              </div>
            </form>

            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Building2 size={16} />
                  </div>
                  Active Departments
                </h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{departments.length} Active</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {departments.map(d => (
                  <div key={d.id} className="group bg-white rounded-xl border-2 border-slate-100 p-4 flex justify-between items-center shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
                    <span className="font-bold text-slate-800 text-sm">{d.name}</span>
                    <button onClick={() => handleDeleteDept(d.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {departments.length === 0 && (
                  <div className="col-span-full p-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                    <Building2 size={24} className="mb-2 opacity-50" />
                    <p className="font-medium text-xs">No departments created yet.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
