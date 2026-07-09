import React, { useState, useEffect } from 'react';
import { UserPlus, ArrowLeft, Bird, ChevronDown, Eye, EyeOff, Check, X, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';

interface Flock {
  id: string;
  house_number: string;
}

interface RegisterProps {
  onBack: () => void;
}

export default function Register({ onBack }: RegisterProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('worker');
  const [assignedFlockId, setAssignedFlockId] = useState('');
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [farm, setFarm] = useState<any>(null);

  // Password structural strength criteria evaluation
  const getsLength = password.length >= 8;
  const getsLower = /[a-z]/.test(password);
  const getsUpper = /[A-Z]/.test(password);
  const getsNumber = /[0-9]/.test(password);
  const getsSpecial = /[^A-Za-z0-9]/.test(password);

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

  useEffect(() => {
    const fetchFlocks = async () => {
      try {
        const data = await apiFetch('/api/flocks');
        setFlocks(data);
      } catch (err) {
        console.error('Failed to fetch flocks:', err);
      }
    };
    fetchFlocks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Require fair or strong password (at least 3 criteria met) and min 8 chars
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (metCount < 3) {
      setError('Password is too weak. Please satisfy at least 3 security criteria.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    
    try {
      const result = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ 
          username, 
          password, 
          fullName,
          role,
          assigned_flock_id: assignedFlockId || null
        }),
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(onBack, 2000);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-6 md:p-10 border border-stone-100"
      >
        <button onClick={onBack} className="mb-6 md:mb-8 text-stone-400 flex items-center hover:text-stone-900 transition-colors font-bold text-[10px] md:text-xs uppercase tracking-widest">
          <ArrowLeft size={16} className="mr-2" /> Back to Login
        </button>

        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-brand-50 rounded-2xl md:rounded-[2rem] text-brand-600 mb-4 md:mb-6 shadow-sm overflow-hidden p-3">
            {farm?.logo_url ? (
              <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Default Logo" className="w-full h-full object-contain" />
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-stone-900 tracking-tight">Create Account</h1>
          <p className="text-xs md:text-sm font-bold text-stone-400 uppercase tracking-widest mt-2">Join FarmFlow<span className="text-brand-600">Pro</span></p>
        </div>

        {success ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-brand-50 text-brand-800 p-6 rounded-2xl text-center font-bold"
          >
            Registration successful! Redirecting...
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Username</label>
              <input
                type="text"
                required
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="input-field pr-12"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setHasInteracted(true);
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {hasInteracted && (
                <div className="mt-3 bg-stone-50 border border-stone-100 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center">
                      <Shield size={12} className={`mr-1 ${strengthTextClass}`} /> Password Strength
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${strengthTextClass}`}>
                      {strengthText}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthColorClass}`} />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-1 pt-1.5 border-t border-stone-100/50">
                    {criteriaList.map((c, i) => (
                      <div key={i} className="flex items-center text-[9px] md:text-[10px] font-bold">
                        {c.met ? (
                          <Check size={12} className="text-emerald-500 mr-1 shrink-0" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-stone-300 mr-2 ml-1 shrink-0" />
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

            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="input-field pr-12"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-1.5 ml-1 flex items-center">
                  <X size={10} className="mr-1" /> Passwords do not match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1.5 ml-1 flex items-center">
                  <Check size={10} className="mr-1" /> Passwords match
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Role</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="worker">Worker</option>
                    <option value="flock_man">Flock-man</option>
                    <option value="egg_collector">Egg Collector</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Designated Flock</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none"
                    value={assignedFlockId}
                    onChange={(e) => setAssignedFlockId(e.target.value)}
                  >
                    <option value="">None</option>
                    {flocks.map(f => (
                      <option key={f.id} value={f.id}>House #{f.house_number}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={16} />
                </div>
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
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
