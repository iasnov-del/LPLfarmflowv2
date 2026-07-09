import React, { useState, useEffect } from 'react';
import { Home, Upload, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../utils/api';

export default function FarmProfile({ user }: { user: any }) {
  const [farm, setFarm] = useState({
    name: '',
    address: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFarm = async () => {
      try {
        const farmData = await apiFetch('/api/farm');
        if (farmData) {
          setFarm(farmData);
        }
      } catch (error) {
        console.error("Error fetching farm profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFarm();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/farm', {
        method: 'POST',
        body: JSON.stringify(farm),
      });
    } catch (err) {
      console.error('Failed to update farm profile', err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFarm({ ...farm, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <header className="text-center mb-12">
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
          Farm Profile
        </h1>
        <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl mx-auto">
          Manage your farm's identity and basic information to maintain a professional presence.
        </p>
      </header>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 bg-pastel-green-50 rounded-3xl border-2 border-dashed border-pastel-green-200 flex items-center justify-center overflow-hidden mb-4 p-4">
              {farm.logo_url ? (
                <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Default Logo" className="w-full h-full object-contain opacity-50" />
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Upload className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-sm text-slate-500">Upload Company Logo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farm Name</label>
              <input
                type="text"
                required
                className="input-field"
                value={farm.name}
                onChange={(e) => setFarm({ ...farm, name: e.target.value })}
                placeholder="Enter farm name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Farm Address</label>
              <textarea
                required
                rows={3}
                className="input-field"
                value={farm.address}
                onChange={(e) => setFarm({ ...farm, address: e.target.value })}
                placeholder="Enter farm address"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary py-3 flex items-center justify-center"
          >
            <Save size={18} className="mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
