import React, { useState, useRef } from 'react';
import { Shield, UserCheck, Download, Database, Upload, AlertTriangle, User, Trash2, Smartphone, Laptop } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

export default function Settings({ user, onLogout }: { user: any, onLogout: () => void }) {
  const { data: users, loading, refresh: refreshUsers } = useApi<any[]>('/api/users');
  const { data: flocks } = useApi<any[]>('/api/flocks');
  const { data: resetRequests, refresh: refreshResetRequests } = useApi<any[]>('/api/password-reset-requests');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [installTab, setInstallTab] = useState<'ios' | 'android' | 'desktop'>('ios');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUserUpdate = async (userId: string, newRole: string, newFlockId: string | null) => {
    try {
      await apiFetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole, assigned_flock_id: newFlockId }),
      });
      refreshUsers();
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  const handleApproveReset = async (requestId: string, username: string) => {
    if (window.confirm(`Approve password reset for @${username}?`)) {
      try {
        await apiFetch(`/api/password-reset-requests/${requestId}/approve`, { method: 'POST' });
        refreshResetRequests();
      } catch (err) {
        console.error('Failed to approve reset', err);
      }
    }
  };

  const handleRejectReset = async (requestId: string) => {
    if (window.confirm('Reject this password reset request?')) {
      try {
        await apiFetch(`/api/password-reset-requests/${requestId}/reject`, { method: 'POST' });
        refreshResetRequests();
      } catch (err) {
        console.error('Failed to reject reset', err);
      }
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (userId === user.id) {
      handleDeleteSelf();
      return;
    }

    if (window.confirm(`Are you sure you want to PERMANENTLY DELETE user @${username}? This action cannot be undone.`)) {
      try {
        await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        refreshUsers();
      } catch (err) {
        console.error('Failed to delete user', err);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const handleDeleteSelf = async () => {
    const confirmation = window.prompt(
      `To confirm account deletion, please type your username: ${user.username}`
    );

    if (confirmation === user.username) {
      try {
        await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' });
        onLogout();
      } catch (err) {
        console.error('Failed to delete your account', err);
        alert('Failed to delete account. Please try again.');
      }
    } else if (confirmation !== null) {
      alert("Username didn't match. Deletion cancelled.");
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const backupData = await apiFetch('/api/backup');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poultry_farm_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Backup failed', err);
      alert('Failed to generate backup. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "WARNING: This will PERMANENTLY DELETE all current data and replace it with the backup. Are you sure you want to proceed?"
    );

    if (!confirmRestore) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupJson = JSON.parse(e.target?.result as string);
          await apiFetch('/api/restore', {
            method: 'POST',
            body: JSON.stringify(backupJson),
          });
          alert('Database restored successfully! The page will now reload.');
          window.location.reload();
        } catch (err) {
          console.error('Restore failed during upload', err);
          alert('Invalid backup file format.');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Restore failed', err);
      alert('Failed to restore backup. Please try again.');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-12">
      <header className="mb-12">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
          System Settings
        </h1>
        <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
          {user.role === 'admin' 
            ? 'Manage user access levels, system configurations, and data integrity to keep your farm running smoothly.'
            : 'Manage your personal account settings and preferences.'}
        </p>
      </header>

      {/* My Account - Visible to Everyone */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="mr-2 text-pastel-green-600" /> My Account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div>
            <p className="text-xs uppercase font-bold text-stone-400 mb-1">Full Name</p>
            <p className="font-bold text-stone-900">{user.fullName}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-stone-400 mb-1">Username</p>
            <p className="font-bold text-stone-900">@{user.username}</p>
          </div>
          <div>
            <p className="text-xs uppercase font-bold text-stone-400 mb-1">Current Role</p>
            <span className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-pastel-green-100 text-pastel-green-700">
              {user.role.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleDeleteSelf}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors text-sm font-bold"
            >
              <Trash2 size={16} />
              <span>Delete My Account</span>
            </button>
          </div>
        </div>
      </div>
      
      {user.role === 'admin' && resetRequests && resetRequests.length > 0 && (
        <div className="card border-2 border-brand-100 bg-brand-50/10">
          <h2 className="text-xl font-bold mb-6 flex items-center text-brand-600">
            <Shield className="mr-2" /> Pending Password Reset Requests
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-brand-100/50 text-brand-800 uppercase text-xs font-bold">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Requested On</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100/30">
                {resetRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-brand-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-stone-900">{req.full_name}</div>
                      <div className="text-xs text-stone-400">@{req.username}</div>
                    </td>
                    <td className="px-6 py-4 text-stone-500 text-sm">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button 
                          onClick={() => handleApproveReset(req.id, req.username)}
                          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectReset(req.id)}
                          className="px-4 py-2 bg-stone-200 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-300 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {user.role === 'admin' ? (
        <>
          <div className="card">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <UserCheck className="mr-2 text-pastel-green-600" /> User Access Management
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-pastel-green-50 text-pastel-green-800 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Assigned Flock</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pastel-green-50">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-pastel-green-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{u.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">@{u.username}</td>
                      <td className="px-6 py-4">
                        <select 
                          className="text-sm border border-pastel-green-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-pastel-green-400 outline-none"
                          value={u.role}
                          onChange={(e) => handleUserUpdate(u.id, e.target.value, u.assigned_flock_id)}
                          disabled={u.id === user.id}
                        >
                          <option value="worker">Worker</option>
                          <option value="manager">Manager</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="egg_collector">Egg Collector</option>
                          <option value="flock_man">Flock-man</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          className="text-sm border border-pastel-green-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-pastel-green-400 outline-none w-full"
                          value={u.assigned_flock_id || ''}
                          onChange={(e) => handleUserUpdate(u.id, u.role, e.target.value || null)}
                        >
                          <option value="">All Flocks</option>
                          {flocks?.map(f => (
                            <option key={f.id} value={f.id}>House #{f.house_number}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          disabled={u.id === user.id && users.filter(usr => usr.role === 'admin').length === 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title={u.id === user.id ? "Cannot delete the last remaining admin" : "Delete User"}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Database className="mr-2 text-pastel-green-600" /> Data Synchronization
            </h2>
            <p className="text-slate-500 mb-6">
              If your application data appears empty or out of sync, use this button to re-trigger the initial data synchronization from Cluster0. 
              This will ensure the default admin account and essential farm profiles are properly initialized.
            </p>
            <button 
              onClick={async () => {
                if (window.confirm("Trigger data synchronization? This will ensure essential system data exists.")) {
                  try {
                    const res = await apiFetch('/api/seed', { method: 'POST' });
                    alert(res.message);
                    window.location.reload();
                  } catch (err) {
                    alert('Sync failed: ' + err);
                  }
                }
              }}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              <Database size={20} />
              <span>Sync with Cluster0</span>
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Download size={20} className="mr-2 text-pastel-green-600" /> Database Backup
            </h2>
            <p className="text-slate-500 mb-6">
              Download a complete backup of your farm's data in JSON format. This includes flocks, egg production, 
              mortality records, feed inventory, and employee data.
            </p>
            <button 
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="flex items-center space-x-2 bg-pastel-green-600 text-white px-6 py-3 rounded-xl hover:bg-pastel-green-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
              <span>{isBackingUp ? 'Generating Backup...' : 'Download Full Backup (JSON)'}</span>
            </button>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Smartphone className="mr-2 text-brand-600 animate-pulse-slow" /> App Download & Install (Apple/Android)
            </h2>
            <p className="text-slate-500 mb-6">
              Install <strong>FarmFlow Pro</strong> on your smartphone, tablet, or computer to enjoy full-screen standalone mode, fast loading, and easier daily access.
            </p>
            
            {/* Tab selection */}
            <div className="flex bg-stone-100 p-1.5 rounded-2xl mb-6 gap-1 max-w-md">
              <button
                type="button"
                onClick={() => setInstallTab('ios')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  installTab === 'ios'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Apple (iOS)
              </button>
              <button
                type="button"
                onClick={() => setInstallTab('android')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  installTab === 'android'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Android
              </button>
              <button
                type="button"
                onClick={() => setInstallTab('desktop')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  installTab === 'desktop'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Desktop
              </button>
            </div>

            {/* Instruction Panels */}
            {installTab === 'ios' && (
              <div className="space-y-4 max-w-2xl bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                <div className="flex items-start gap-3 bg-amber-50/80 p-3.5 rounded-xl text-[11px] leading-relaxed font-semibold text-amber-950 border border-amber-100">
                  <span className="text-sm shrink-0">⚠️</span>
                  <p>
                    <strong>Safari browser is required</strong> on Apple iOS to add apps to your Home Screen. If you opened this in another browser (like Chrome, Firefox, or in-app), copy the website address and open it in Safari.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Tap the <strong className="text-stone-900">Share</strong> icon (represented by a square with an up-arrow <span className="inline-block px-1 bg-stone-200 rounded text-[10px] font-bold">⬆</span>) in Safari's bottom toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Scroll down through the share options and select <strong className="text-stone-900">"Add to Home Screen"</strong> (represented by a square with a plus sign <span className="inline-block px-1 bg-stone-200 rounded text-[10px] font-bold">＋</span>).
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Confirm the name as "FarmFlow Pro" and click <strong className="text-stone-900">"Add"</strong> in the top-right corner. The app icon will now appear on your iPhone or iPad!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {installTab === 'android' && (
              <div className="space-y-4 max-w-2xl bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Tap the <strong className="text-stone-900">three-dot menu button</strong> (<span className="inline-block px-1 bg-stone-200 rounded text-[10px] font-bold">⋮</span>) in the top-right corner of Chrome.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Tap <strong className="text-stone-900">"Install app"</strong> or <strong className="text-stone-900">"Add to Home screen"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Confirm the dialogue. Android will automatically package and download the application to your launcher screen!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {installTab === 'desktop' && (
              <div className="space-y-4 max-w-2xl bg-stone-50/50 p-5 rounded-2xl border border-stone-100">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Look at your browser's address/URL bar at the top of the window. You should see an <strong className="text-stone-900">Install icon</strong> (typically a computer screen with a downward arrow, or a plus button). Click it!
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-stone-600 font-semibold leading-relaxed">
                      Alternatively, click your browser's options menu (three dots <span className="inline-block px-1 bg-stone-200 rounded text-[10px] font-bold">⋮</span>) and select <strong className="text-stone-900">"Install FarmFlow Pro..."</strong> or <strong className="text-stone-900">"Save and share" ➜ "Install app"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card border-2 border-red-100">
            <h2 className="text-xl font-bold mb-4 flex items-center text-red-600">
              <Upload className="mr-2" /> Restore Database
            </h2>
            <div className="flex items-start space-x-4 mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="text-red-600 shrink-0" size={24} />
              <div className="text-sm text-red-800">
                <p className="font-bold mb-1">DANGER ZONE</p>
                <p>Restoring a backup will <strong>overwrite all current data</strong>. This action cannot be undone. Make sure you have a backup of your current data before proceeding.</p>
              </div>
            </div>
            
            <input 
              type="file" 
              accept=".json" 
              onChange={handleRestoreBackup}
              ref={fileInputRef}
              className="hidden"
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isRestoring}
              className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={20} />
              <span>{isRestoring ? 'Restoring Data...' : 'Upload & Restore Backup (JSON)'}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="card bg-amber-50 border border-amber-100">
          <div className="flex items-center space-x-3 text-amber-800">
            <Shield size={24} className="opacity-50" />
            <p className="text-sm font-medium">Advanced system settings (Backup, Restore, User Management) are restricted to administrators.</p>
          </div>
        </div>
      )}

      <div className="card bg-pastel-green-900 text-white">
        <h2 className="text-xl font-bold mb-4">System Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-pastel-green-300 text-xs uppercase font-bold">Version</p>
            <p className="font-mono">v1.1.0-mongodb</p>
          </div>
          <div>
            <p className="text-pastel-green-300 text-xs uppercase font-bold">Database</p>
            <p className="font-mono">MongoDB</p>
          </div>
          <div>
            <p className="text-pastel-green-300 text-xs uppercase font-bold">Environment</p>
            <p className="font-mono">Production</p>
          </div>
          <div>
            <p className="text-pastel-green-300 text-xs uppercase font-bold">Auth Provider</p>
            <p className="font-mono">Local API (JWT/Session)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
