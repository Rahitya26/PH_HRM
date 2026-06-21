import { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { BranchContext } from './context/BranchContext';
import { AuthContext } from './context/AuthContext';
import { LayoutDashboard, Users, UserPlus, Clock, Fingerprint, Hexagon, LogOut } from 'lucide-react';
import Login from './pages/Login';
import ManagerAttendance from './pages/ManagerAttendance';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Onboarding from './pages/Onboarding';
import Shifts from './pages/Shifts';
import Payroll from './pages/Payroll';
import Branches from './pages/Branches';
import { Banknote, Building2 } from 'lucide-react';

function Sidebar() {
  const location = useLocation();
  const { branches, selectedBranch } = useContext(BranchContext);
  const { logout } = useContext(AuthContext);
  const currentBranchName = branches.find(b => b.id === selectedBranch)?.name || 'Loading...';

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Onboarding', path: '/onboarding', icon: UserPlus },
    { name: 'Shifts & Depts', path: '/shifts', icon: Clock },
    { name: 'Payroll', path: '/payroll', icon: Banknote },
    { name: 'Branches', path: '/branches', icon: Building2 },
  ];

  return (
    <div className="w-64 glass border-r border-white/50 h-screen fixed flex flex-col z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Hexagon size={20} className="fill-current text-white/20" />
        </div>
        <div>
          <div className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight leading-none">
            Ravi's HRM
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
            <Building2 size={10} /> {currentBranchName}
          </div>
        </div>
      </div>
      
      <div className="px-5 mb-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Main Menu</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative group overflow-hidden ${
                isActive 
                  ? 'text-white shadow-sm shadow-indigo-500/20' 
                  : 'text-gray-500 hover:text-indigo-600 hover:bg-white/50'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-100 transition-opacity"></div>
              )}
              <item.icon size={18} className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="relative z-10">{item.name}</span>
              
              {!isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-indigo-600 rounded-r-full opacity-0 group-hover:h-1/2 group-hover:opacity-100 transition-all duration-300"></div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-white/60 to-white/30 backdrop-blur-md border border-white/50 p-3 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 border border-white">
              <Fingerprint size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Admin User</p>
              <p className="text-[10px] text-gray-500 font-medium">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) return null;

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  if (user.role === 'manager') {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<ManagerAttendance />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
        
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-300/20 blur-[100px] pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-300/20 blur-[120px] pointer-events-none z-0"></div>
        <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-200/20 blur-[100px] pointer-events-none z-0"></div>

        <Sidebar />
        <div className="ml-64 flex-1 p-6 relative z-10 overflow-x-hidden">
          <div className="w-full mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
