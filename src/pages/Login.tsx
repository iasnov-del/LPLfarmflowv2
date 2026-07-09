import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Bird, Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';

interface LoginProps {
  onLogin: (user: any) => void;
  onRegister: () => void;
}

export default function Login({ onLogin, onRegister }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [hasInteractedNewPassword, setHasInteractedNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [farm, setFarm] = useState<any>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // New Password security requirements evaluation
  const getsLength = newPassword.length >= 8;
  const getsLower = /[a-z]/.test(newPassword);
  const getsUpper = /[A-Z]/.test(newPassword);
  const getsNumber = /[0-9]/.test(newPassword);
  const getsSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const criteriaList = [
    { met: getsLength, label: "8+ characters" },
    { met: getsLower, label: "Lowercase (a-z)" },
    { met: getsUpper, label: "Uppercase (A-Z)" },
    { met: getsNumber, label: "Number (0-9)" },
    { met: getsSpecial, label: "Special symbol" },
  ];

  const metCount = criteriaList.filter(c => c.met).length;

  let strengthText = 'Weak';
  let strengthColorClass = 'bg-rose-500 w-1/3';
  let strengthTextClass = 'text-rose-500';

  if (metCount === 5) {
    strengthText = 'Strong';
    strengthColorClass = 'bg-emerald-500 w-full';
    strengthTextClass = 'text-emerald-500';
  } else if (metCount >= 3) {
    strengthText = 'Fair';
    strengthColorClass = 'bg-amber-500 w-2/3';
    strengthTextClass = 'text-amber-500';
  } else if (metCount === 0) {
    strengthText = 'None';
    strengthColorClass = 'bg-stone-200 w-0';
    strengthTextClass = 'text-stone-400';
  }

  useEffect(() => {
    const fetchFarm = async () => {
      try {
        const farmData = await apiFetch('/api/farm');
        if (farmData) {
          setFarm(farmData);
        }
      } catch (error) {
        console.error("Error fetching farm profile:", error);
      }
    };
    fetchFarm();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetMessage('');
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      setIsResetting(false);
      return;
    }

    if (metCount < 3) {
      setResetError('Password is too weak. Please satisfy at least 3 security criteria.');
      setIsResetting(false);
      return;
    }

    try {
      const result = await apiFetch('/api/password-reset-request', {
        method: 'POST',
        body: JSON.stringify({ username: resetUsername, newPassword }),
      });
      
      if (result.success) {
        setResetMessage(result.message);
        setResetUsername('');
        setNewPassword('');
        setTimeout(() => setIsResetModalOpen(false), 3000);
      } else {
        setResetError(result.message || 'Failed to submit request');
      }
    } catch (err: any) {
      setResetError(err.message || 'An error occurred');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 md:p-10 border border-stone-100"
      >
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-brand-50 rounded-2xl md:rounded-[2rem] text-brand-600 mb-4 md:mb-6 shadow-sm overflow-hidden p-3">
            {farm?.logo_url ? (
              <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Default Logo" className="w-full h-full object-contain" />
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-stone-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs md:text-sm font-bold text-stone-400 uppercase tracking-widest mt-2">Sign in to FarmFlow<span className="text-brand-600">Pro</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Username</label>
            <input
              type="text"
              required
              className="input-field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest">Password</label>
              <button 
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 uppercase tracking-widest"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="input-field pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-4 flex items-center justify-center text-lg"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-stone-100 text-center">
          <p className="text-stone-400 text-sm mb-6">Don't have an account yet?</p>
          <button
            onClick={onRegister}
            className="btn-secondary w-full py-4 flex items-center justify-center"
          >
            <UserPlus size={20} className="mr-3" />
            Create Account
          </button>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-2xl font-black text-stone-900 mb-2">Reset Password</h2>
            <p className="text-stone-500 text-sm mb-6">Enter your username and your new desired password. An admin must approve this request before it takes effect.</p>
            
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Username</label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    className="input-field text-sm pr-12"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setHasInteractedNewPassword(true);
                    }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {hasInteractedNewPassword && (
                  <div className="mt-2 bg-stone-50 border border-stone-100 rounded-2xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest flex items-center">
                        <Shield size={10} className={`mr-1 ${strengthTextClass}`} /> Strength:
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider ${strengthTextClass}`}>
                        {strengthText}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strengthColorClass}`} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                      {criteriaList.map((c, i) => (
                        <div key={i} className="flex items-center text-[9px] font-bold">
                          {c.met ? (
                            <Check size={10} className="text-emerald-500 mr-1 shrink-0" />
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-stone-300 mr-1.5 ml-0.5 shrink-0" />
                          )}
                          <span className={c.met ? "text-stone-700" : "text-stone-400"}>
                            {c.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {resetMessage && (
                <p className="text-brand-600 text-sm font-bold bg-brand-50 p-3 rounded-xl">
                  {resetMessage}
                </p>
              )}
              {resetError && (
                <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">
                  {resetError}
                </p>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 btn-secondary py-3 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex-1 btn-primary py-3 text-sm"
                >
                  {isResetting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
