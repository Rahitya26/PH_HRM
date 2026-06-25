import { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { BranchContext } from './context/BranchContext';
import { AuthContext } from './context/AuthContext';
import { LayoutDashboard, Users, UserPlus, Clock, Fingerprint, Hexagon, LogOut, Banknote, Building2, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import ManagerAttendance from './pages/ManagerAttendance';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Onboarding from './pages/Onboarding';
import Shifts from './pages/Shifts';
import Payroll from './pages/Payroll';
import Branches from './pages/Branches';
import AdminProfile from './pages/AdminProfile';

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { branches, selectedBranch } = useContext(BranchContext);
  const { user, logout } = useContext(AuthContext);
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
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <div className={`w-64 glass bg-white/80 backdrop-blur-xl border-r border-slate-200 h-screen fixed flex flex-col z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Mobile close button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-800 md:hidden"
        >
          <X size={20} />
        </button>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Hexagon size={20} className="fill-current text-white/20" />
        </div>
        <div>
          <div className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight leading-none">
            PHV HRM
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
              onClick={() => setIsOpen(false)}
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
          <Link to="/admin-profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 border border-white">
              <Fingerprint size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">{user?.username || 'Admin User'}</p>
              <p className="text-[10px] text-gray-500 font-medium">Administrator</p>
            </div>
          </Link>
          <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

function App() {
  const { user, isLoading } = useContext(AuthContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col min-h-screen md:ml-64 relative z-10 w-full">
          {/* Mobile Header for hamburger */}
          <div className="md:hidden flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <Hexagon size={16} className="fill-current text-white/20" />
              </div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700">PHV HRM</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>

          <div className="p-4 md:p-6 overflow-x-hidden flex-1 max-w-[100vw] md:max-w-none">
            <div className="w-full mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/shifts" element={<Shifts />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/admin-profile" element={<AdminProfile />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
