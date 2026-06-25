import { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, User, Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AdminProfile() {
  const { user, login } = useContext(AuthContext); // we can update context if needed, but logout might be easier
  const [step, setStep] = useState(1); // 1: Info, 2: Verify OTP, 3: Update Password
  const [formData, setFormData] = useState({
    newUsername: user?.username || 'ravi',
    newEmail: user?.email || 'admin@daddyhrm.com',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/send-otp', { email: formData.newEmail });
      setStep(2);
      setSuccess('OTP sent successfully. Please check your email.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/admin/verify-otp', { email: formData.newEmail, otp });
      setStep(3);
      setSuccess('OTP verified successfully! Now, enter your new password.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/update-profile', {
        currentUsername: user?.username || 'ravi',
        newUsername: formData.newUsername,
        newEmail: formData.newEmail,
        otp,
        newPassword: formData.password
      });
      setSuccess('Profile updated successfully! Please login again.');
      setTimeout(() => {
        window.location.href = '/'; // force reload to login
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-sm";

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-white/10 rotate-12 pointer-events-none"></div>
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-xl">
            <User size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Admin Settings</h2>
          <p className="text-indigo-100 text-sm mt-1 font-medium">Update your login credentials securely</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-600">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{success}</p>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5 animate-fade-up">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">New Username</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                  <input type="text" required value={formData.newUsername} onChange={e => setFormData({...formData, newUsername: e.target.value})} className={inputCls} placeholder="Admin username" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Email Address (For OTP)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={18} /></div>
                  <input type="email" required value={formData.newEmail} onChange={e => setFormData({...formData, newEmail: e.target.value})} className={inputCls} placeholder="admin@example.com" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Send OTP <Mail size={16} /></>}
              </button>
            </form>
          )}
          
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-up">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center mb-6">
                <p className="text-sm font-medium text-slate-600">We've sent a 6-digit OTP to</p>
                <p className="text-base font-bold text-slate-800">{formData.newEmail}</p>
                <p className="text-[10px] font-bold text-indigo-500 uppercase mt-2">(Check your email or server console)</p>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block text-center">Enter OTP</label>
                <div className="relative max-w-xs mx-auto">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400"><KeyRound size={20} /></div>
                  <input type="text" required maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border-2 border-indigo-100 text-indigo-800 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-black text-xl tracking-[0.2em] text-center shadow-sm" placeholder="------" />
                </div>
              </div>

              <button type="submit" disabled={loading || otp.length < 6} className="w-full max-w-xs mx-auto block py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              
              <button type="button" onClick={() => setStep(1)} className="w-full max-w-xs mx-auto block py-2 text-slate-500 hover:text-slate-800 font-bold text-xs mt-2 transition-colors">
                Cancel / Go Back
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleUpdatePassword} className="space-y-5 animate-fade-up">
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">New Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={18} /></div>
                    <input type={showPassword ? "text" : "password"} required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className={inputCls} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={18} /></div>
                    <input type={showConfirmPassword ? "text" : "password"} required minLength={6} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className={inputCls} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading || !formData.password} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Save New Credentials <CheckCircle2 size={16} /></>}
              </button>
              
              <button type="button" onClick={() => setStep(1)} className="w-full block py-2 text-slate-500 hover:text-slate-800 font-bold text-xs mt-2 transition-colors text-center">
                Cancel / Start Over
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
