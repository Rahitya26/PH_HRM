import { useState, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { Building2, Plus, Edit2, Users, Check } from 'lucide-react';

export default function Branches() {
  const { branches, selectedBranch, fetchBranches } = useContext(BranchContext);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchName, setBranchName] = useState('');
  const [branchUsername, setBranchUsername] = useState('');
  const [branchPassword, setBranchPassword] = useState('');

  const sortedBranches = [...branches].sort((a, b) => {
    if (a.id === selectedBranch) return -1;
    if (b.id === selectedBranch) return 1;
    return a.name.localeCompare(b.name);
  });

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setBranchName(branch.name);
      setBranchUsername(branch.username || '');
      setBranchPassword(branch.password || '');
    } else {
      setEditingBranch(null);
      setBranchName('');
      setBranchUsername('');
      setBranchPassword('');
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { name: branchName, username: branchUsername, password: branchPassword };
      if (editingBranch) {
        await axios.put(`/api/branches/${editingBranch.id}`, payload);
      } else {
        await axios.post('/api/branches', payload);
      }
      await fetchBranches();
      setShowModal(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save branch');
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Branches</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage multiple office locations and branches.</p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
        >
          <Plus size={16} strokeWidth={3} /> Add New Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedBranches.map(b => {
          const isCurrent = b.id === selectedBranch;
          return (
            <div 
              key={b.id} 
              className={`relative overflow-hidden group rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col ${
                isCurrent 
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-500/30 border border-indigo-400/50' 
                  : 'bg-white border-2 border-slate-100 hover:border-indigo-300 shadow-sm text-slate-800'
              }`}
            >
              {isCurrent && (
                <>
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-purple-400/20 rounded-full blur-xl"></div>
                </>
              )}

              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                  isCurrent 
                    ? 'bg-white/20 text-white border border-white/20' 
                    : 'bg-gradient-to-tr from-slate-100 to-white text-indigo-500 border border-slate-200 group-hover:from-indigo-50 group-hover:to-white group-hover:border-indigo-200 transition-colors'
                }`}>
                  <Building2 size={28} strokeWidth={1.5} />
                </div>
                
                <div className="flex gap-2">
                  {isCurrent && (
                    <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-400/30 text-[10px] uppercase font-black tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
                      <Check size={12} strokeWidth={4} /> Current
                    </span>
                  )}
                  <button 
                    onClick={() => handleOpenModal(b)} 
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm ${
                      isCurrent 
                        ? 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white' 
                        : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="relative z-10 mt-auto">
                <h3 className={`text-xl font-extrabold mb-2 tracking-tight ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                  {b.name}
                </h3>
                
                <div className={`flex items-center justify-between pt-4 mt-2 border-t border-dashed ${isCurrent ? 'border-white/20' : 'border-slate-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isCurrent ? 'text-indigo-100' : 'text-slate-500'}`}>
                    <Users size={14} className={isCurrent ? 'text-indigo-200' : 'text-slate-400'} /> Team Size
                  </p>
                  <p className={`text-base font-black ${isCurrent ? 'text-white' : 'text-indigo-600'}`}>
                    {b.employee_count || 0}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center backdrop-blur-md bg-slate-900/40 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Building2 size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">{editingBranch ? 'Edit Branch' : 'Add Branch'}</h2>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch Name</label>
                <input 
                  type="text" 
                  required 
                  value={branchName} 
                  onChange={e => setBranchName(e.target.value)} 
                  placeholder="e.g. Hyderabad Branch"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                  <input 
                    type="text" 
                    required 
                    value={branchUsername} 
                    onChange={e => setBranchUsername(e.target.value)} 
                    placeholder="e.g. hyd_mgr"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                  <input 
                    type="text" 
                    required 
                    value={branchPassword} 
                    onChange={e => setBranchPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2.5 font-bold text-slate-800 focus:border-indigo-500 outline-none text-sm" 
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-auto">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/30">
                  {editingBranch ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
