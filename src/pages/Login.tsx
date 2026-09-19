import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Bird, Eye, EyeOff, Check, X, Shield, Server, Globe, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch, getApiBaseUrl, setCustomApiBaseUrl, CLOUD_RUN_BACKEND_URL } from '../utils/api';

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

  // Server connection configuration state for Netlify / external deployments
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl() || CLOUD_RUN_BACKEND_URL);
  const [testConnectionStatus, setTestConnectionStatus] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

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

        <div className="mt-10 pt-8 border-t border-stone-100 text-center space-y-4">
          <div>
            <p className="text-stone-400 text-sm mb-4">Don't have an account yet?</p>
            <button
              onClick={onRegister}
              className="btn-secondary w-full py-4 flex items-center justify-center"
            >
              <UserPlus size={20} className="mr-3" />
              Create Account
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setServerUrlInput(getApiBaseUrl() || CLOUD_RUN_BACKEND_URL);
                setTestConnectionStatus(null);
                setIsServerModalOpen(true);
              }}
              className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full hover:bg-stone-100"
              title="Configure or test connection to backend server"
            >
              <Server size={12} className="text-pastel-green-600" />
              <span>
                Backend API: {getApiBaseUrl() ? new URL(getApiBaseUrl(), window.location.href).host : 'Default (Cloud Run)'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Backend Server Connection Settings Modal (for Netlify / external hosting) */}
      {isServerModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-100"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center space-x-2 text-pastel-green-800">
                <Server size={20} />
                <h3 className="text-lg font-bold text-stone-900">Backend API Server</h3>
              </div>
              <button 
                onClick={() => setIsServerModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              When accessing FarmFlow via <strong>Netlify</strong> or custom domains, the web app connects to the Cloud Run backend server. You can test or update the backend URL below.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  API Server URL
                </label>
                <input
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  placeholder={CLOUD_RUN_BACKEND_URL}
                  className="w-full text-xs font-mono border border-stone-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-pastel-green-400 outline-none"
                />
              </div>

              {testConnectionStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testConnectionStatus.includes('Connected') 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <Globe size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-tight">{testConnectionStatus}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isTestingConnection}
                  onClick={async () => {
                    setIsTestingConnection(true);
                    setTestConnectionStatus(null);
                    try {
                      const testTarget = (serverUrlInput.trim() || CLOUD_RUN_BACKEND_URL).replace(/\/$/, '') + '/api/health';
                      const res = await fetch(testTarget, { headers: { Accept: 'application/json' } });
                      if (res.ok) {
                        const data = await res.json();
                        setTestConnectionStatus(`Connected! Server is online (DB: ${data.database || 'ready'}).`);
                      } else {
                        setTestConnectionStatus(`Server reachable, status HTTP ${res.status}`);
                      }
                    } catch (err: any) {
                      setTestConnectionStatus(`Connection failed: ${err.message || 'Cannot reach server'}`);
                    } finally {
                      setIsTestingConnection(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className={isTestingConnection ? 'animate-spin' : ''} />
                  <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServerUrlInput(CLOUD_RUN_BACKEND_URL);
                    setCustomApiBaseUrl(null);
                    setTestConnectionStatus('Reset to default Cloud Run backend.');
                  }}
                  className="px-3 py-1.5 text-stone-500 hover:text-stone-800 text-xs font-semibold"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsServerModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomApiBaseUrl(serverUrlInput.trim() || null);
                  setIsServerModalOpen(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-pastel-green-600 hover:bg-pastel-green-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Save & Apply
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
