import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { BranchContext } from '../context/BranchContext';
import { Link } from 'react-router-dom';
import { Users, Clock, Building2, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, gradient, shadowColor }) => (
  <div className={`relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${shadowColor} bg-white border border-white/50 backdrop-blur-xl group`}>
    
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${gradient} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`}></div>
    <div className={`absolute -left-4 -bottom-4 w-16 h-16 rounded-full ${gradient} opacity-10 blur-lg group-hover:opacity-20 transition-opacity duration-500`}></div>

    <div className="relative z-10 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md`}>
          <Icon size={20} className="md:w-6 md:h-6" strokeWidth={2} />
        </div>
      </div>
      
      <div className="mt-auto">
        <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-0.5 md:mb-1">
          {value ?? <span className="animate-pulse text-slate-300">...</span>}
        </h3>
        <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({ total_employees: 0, total_shifts: 0, total_departments: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { branches, selectedBranch, changeBranch } = useContext(BranchContext);

  useEffect(() => {
    if (selectedBranch) {
      setIsLoading(true);
      axios.get(`/api/dashboard/stats?branch_id=${selectedBranch}`)
        .then(res => setStats(res.data))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [selectedBranch]);

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-bold tracking-wide mb-2">
            <Sparkles size={12} /> System Overview
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Here's what's happening in your organization today.</p>
        </div>
        
        <div className="flex flex-col sm:items-end gap-2 mt-4 sm:mt-0">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Date</p>
            <p className="text-lg font-bold text-slate-800">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Branch:</span>
            <div className="relative">
              <select 
                value={selectedBranch || ''} 
                onChange={(e) => changeBranch(e.target.value)}
                className="appearance-none bg-transparent text-sm font-extrabold text-slate-800 pr-6 focus:outline-none cursor-pointer w-full"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                <ChevronDown size={14} strokeWidth={3} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <h3 className="text-xl font-extrabold text-slate-700 tracking-tight">Loading Dashboard...</h3>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
          <StatCard 
            title="Total Employees" 
            value={stats.total_employees} 
            icon={Users} 
            gradient="from-indigo-500 to-blue-600"
            shadowColor="shadow-indigo-500/10"
          />
          <StatCard 
            title="Active Shifts" 
            value={stats.total_shifts} 
            icon={Clock} 
            gradient="from-purple-500 to-pink-600"
            shadowColor="shadow-purple-500/10"
          />
          <StatCard 
            title="Departments" 
            value={stats.total_departments} 
            icon={Building2} 
            gradient="from-emerald-400 to-teal-500"
            shadowColor="shadow-emerald-500/10"
          />
        </div>
      )}
      
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 sm:p-10 text-white shadow-xl shadow-slate-900/20 group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-transparent opacity-50"></div>
        
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity duration-700"></div>
        <div className="absolute -left-10 -bottom-10 w-56 h-56 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-full blur-[60px] opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 text-[10px] font-bold tracking-wide mb-4">
            PHV HRM v2.0
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-3 leading-tight">Empower your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">workforce.</span></h2>
          <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed mb-6">
            Manage employees seamlessly, track real-time attendance, and handle complex payroll structures from a single, unified command center.
          </p>
          <Link to="/employees" className="inline-flex bg-white text-slate-900 px-6 py-3 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-colors shadow-lg shadow-white/10 items-center gap-2 w-max">
            View All Employees <Users size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
