import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Hexagon, Lock, User, Eye, EyeOff, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password States
  const [forgotStep, setForgotStep] = useState(0); // 0 = login, 1 = username, 2 = otp, 3 = new password
  const [resetUsername, setResetUsername] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role === 'admin') {
        navigate('/');
      } else {
        navigate('/manager-attendance');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/forgot-password/send-otp', { username: resetUsername });
      setResetEmail(res.data.email);
      setForgotStep(2);
      setSuccessMsg(res.data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/verify-otp', { email: resetEmail, otp: resetOtp });
      setForgotStep(3);
      setSuccessMsg('OTP Verified! Enter your new password.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/forgot-password/reset', { 
        email: resetEmail, 
        otp: resetOtp, 
        newPassword 
      });
      setSuccessMsg(res.data.message);
      setForgotStep(0); // Back to login
      setPassword(''); // Clear old password
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-300/20 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-indigo-300/20 blur-[120px] pointer-events-none z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-xl shadow-indigo-500/10 border border-slate-100 p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
            <Hexagon size={32} className="fill-current text-white/20" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">PHV HRM Portal</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Sign in to manage your workspace</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {forgotStep === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-400" />
                </div>
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => { setForgotStep(1); setError(''); setSuccessMsg(''); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                  Forgot Password?
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex justify-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
            </button>
          </form>
        ) : forgotStep === 1 ? (
          <form onSubmit={handleForgotSendOtp} className="space-y-5 animate-fade-up">
            <p className="text-sm font-medium text-slate-500 text-center mb-6">Enter your Admin username to receive an OTP to your registered email.</p>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-400" />
                </div>
                <input type="text" required value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all" placeholder="Enter admin username" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-70">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send OTP <Mail size={16} className="ml-2" /></>}
            </button>
            <button type="button" onClick={() => setForgotStep(0)} className="w-full flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={14} className="mr-1" /> Back to Login
            </button>
          </form>
        ) : forgotStep === 2 ? (
          <form onSubmit={handleForgotVerifyOtp} className="space-y-5 animate-fade-up">
            <p className="text-sm font-bold text-indigo-600 text-center mb-6">OTP sent to your email!</p>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enter OTP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound size={16} className="text-slate-400" />
                </div>
                <input type="text" required maxLength={6} value={resetOtp} onChange={(e) => setResetOtp(e.target.value)} className="w-full pl-10 pr-3 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-black tracking-widest text-indigo-800 focus:border-indigo-500 focus:bg-white outline-none transition-all" placeholder="------" />
              </div>
            </div>

            <button type="submit" disabled={loading || resetOtp.length < 6} className="w-full flex justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-70">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify OTP'}
            </button>
            <button type="button" onClick={() => setForgotStep(0)} className="w-full flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={14} className="mr-1" /> Cancel
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotReset} className="space-y-5 animate-fade-up">
            <p className="text-sm font-bold text-indigo-600 text-center mb-6">Create your new password.</p>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input type={showNewPassword ? "text" : "password"} required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all" placeholder="••••••••" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !newPassword} className="w-full flex justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-70">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Reset Password <CheckCircle2 size={16} className="ml-2" /></>}
            </button>
            <button type="button" onClick={() => setForgotStep(0)} className="w-full flex items-center justify-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={14} className="mr-1" /> Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
