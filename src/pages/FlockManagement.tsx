import React, { useState } from 'react';
import { Bird, Plus, Edit2, ArrowRightLeft, Download, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';
import { exportToExcel } from '../utils/excelExport';

export default function FlockManagement({ user }: { user: any }) {
  const { data: allFlocks, loading: flocksLoading, refresh: refreshFlocks } = useApi<any>('/api/flocks');
  const { data: mortality } = useApi<any>('/api/mortality');
  const { data: transfers, refresh: refreshTransfers } = useApi<any>('/api/flock-transfers');
  const { data: weightRecords } = useApi<any>('/api/weight-records');
  const { data: weightStandards } = useApi<any>('/api/weight-standards');
  
  const flocks = user.assigned_flock_id 
    ? (allFlocks || []).filter((f: any) => f.id === user.assigned_flock_id)
    : (allFlocks || []);
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingFlock, setEditingFlock] = useState<any>(null);
  const [formData, setFormData] = useState({
    house_number: '',
    beginning_male: 0,
    beginning_female: 0,
    loading_date: new Date().toISOString().split('T')[0],
    breed: ''
  });

  const [transferData, setTransferData] = useState({
    from_flock_id: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    reported_by: user.fullName,
    destinations: [
      { to_flock_id: '', male_count: 0, female_count: 0 }
    ]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingFlock) {
        await apiFetch(`/api/flocks/${editingFlock.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/flocks', {
          method: 'POST',
          body: JSON.stringify({
            ...formData,
            status: 'active'
          }),
        });
      }
      
      setIsModalOpen(false);
      setEditingFlock(null);
      setFormData({
        house_number: '',
        beginning_male: 0,
        beginning_female: 0,
        loading_date: new Date().toISOString().split('T')[0],
        breed: ''
      });
      refreshFlocks();
    } catch (err: any) {
      console.error('Failed to save flock:', err);
      setError(err.message || 'Failed to save flock');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty destinations
      const validDestinations = transferData.destinations.filter(d => d.to_flock_id && (d.male_count > 0 || d.female_count > 0));
      
      if (validDestinations.length === 0) {
        setError('Please add at least one valid destination house with bird counts.');
        return;
      }

      // Process each transfer sequentially or use a batch endpoint if available
      // For now, we'll loop through each destination as separate transfers
      for (const dest of validDestinations) {
        await apiFetch('/api/flock-transfers', {
          method: 'POST',
          body: JSON.stringify({
            from_flock_id: transferData.from_flock_id,
            to_flock_id: dest.to_flock_id,
            male_count: dest.male_count,
            female_count: dest.female_count,
            date: transferData.date,
            reason: transferData.reason,
            reported_by: transferData.reported_by
          }),
        });
      }
      
      setIsTransferModalOpen(false);
      refreshTransfers();
      refreshFlocks();
    } catch (err: any) {
      console.error('Failed to transfer birds:', err);
      setError(err.message || 'Failed to transfer birds');
    }
  };

  const addDestination = () => {
    setTransferData({
      ...transferData,
      destinations: [...transferData.destinations, { to_flock_id: '', male_count: 0, female_count: 0 }]
    });
  };

  const removeDestination = (index: number) => {
    if (transferData.destinations.length <= 1) return;
    const newDestinations = [...transferData.destinations];
    newDestinations.splice(index, 1);
    setTransferData({ ...transferData, destinations: newDestinations });
  };

  const updateDestination = (index: number, field: string, value: any) => {
    const newDestinations = [...transferData.destinations];
    newDestinations[index] = { ...newDestinations[index], [field]: value };
    setTransferData({ ...transferData, destinations: newDestinations });
  };

  const calculateStats = (flock: any) => {
    const loadingDate = new Date(flock.loading_date);
    const today = new Date();
    const ageWeeks = Math.floor((today.getTime() - loadingDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    const getFlockId = (f: any) => {
      if (!f) return null;
      return typeof f === 'object' ? (f.id || f._id) : f;
    };

    const flockMortality = (mortality || []).filter(m => {
      const mFlockId = getFlockId(m.flock_id);
      return mFlockId === flock.id;
    });
    
    const maleMortality = flockMortality.reduce((acc, m) => acc + (m.male_mortality || 0), 0);
    const femaleMortality = flockMortality.reduce((acc, m) => acc + (m.female_mortality || 0), 0);
    const totalMortality = maleMortality + femaleMortality;

    const maleSpotCull = flockMortality.reduce((acc, m) => acc + (m.male_spot_cull || 0), 0);
    const femaleSpotCull = flockMortality.reduce((acc, m) => acc + (m.female_spot_cull || 0), 0);
    const totalSpotCull = maleSpotCull + femaleSpotCull;

    const maleMissex = flockMortality.reduce((acc, m) => acc + (m.male_missex || 0), 0);
    const femaleMissex = flockMortality.reduce((acc, m) => acc + (m.female_missex || 0), 0);
    const totalMissex = maleMissex + femaleMissex;

    const maleSpentCull = flockMortality.reduce((acc, m) => acc + (m.male_spent_cull || 0), 0);
    const femaleSpentCull = flockMortality.reduce((acc, m) => acc + (m.female_spent_cull || 0), 0);
    const totalSpentCull = maleSpentCull + femaleSpentCull;

    const maleDead = maleMortality + maleSpotCull + maleSpentCull + maleMissex;
    const femaleDead = femaleMortality + femaleSpotCull + femaleSpentCull + femaleMissex;
    
    const flockOutgoing = (transfers || []).filter(t => {
      const tFromId = getFlockId(t.from_flock_id);
      return tFromId === flock.id;
    });
    const flockIncoming = (transfers || []).filter(t => {
      const tToId = getFlockId(t.to_flock_id);
      return tToId === flock.id;
    });

    const maleOutgoing = flockOutgoing.reduce((acc, t) => acc + (t.male_count || 0), 0);
    const femaleOutgoing = flockOutgoing.reduce((acc, t) => acc + (t.female_count || 0), 0);
    
    const maleIncoming = flockIncoming.reduce((acc, t) => acc + (t.male_count || 0), 0);
    const femaleIncoming = flockIncoming.reduce((acc, t) => acc + (t.female_count || 0), 0);

    const maleBeginning = flock.beginning_male || 0;
    const femaleBeginning = flock.beginning_female || 0;
    
    const maleEnding = maleBeginning - maleDead - maleOutgoing + maleIncoming;
    const femaleEnding = femaleBeginning - femaleDead - femaleOutgoing + femaleIncoming;
    
    const maleTotalStarted = maleBeginning + maleIncoming;
    const femaleTotalStarted = femaleBeginning + femaleIncoming;

    const maleLivability = maleTotalStarted > 0 ? (((maleTotalStarted - maleDead) / maleTotalStarted) * 100).toFixed(2) : "0.00";
    const femaleLivability = femaleTotalStarted > 0 ? (((femaleTotalStarted - femaleDead) / femaleTotalStarted) * 100).toFixed(2) : "0.00";
    
    const totalBeginning = maleBeginning + femaleBeginning;
    const totalIncoming = maleIncoming + femaleIncoming;
    const totalTotalStarted = totalBeginning + totalIncoming;
    const totalDead = maleDead + femaleDead;
    const totalEnding = maleEnding + femaleEnding;
    const totalLivability = totalTotalStarted > 0 ? (((totalTotalStarted - totalDead) / totalTotalStarted) * 100).toFixed(2) : "0.00";

    const maleToFemaleRatio = femaleEnding > 0 ? ((maleEnding / femaleEnding) * 100).toFixed(2) : '0.00';

    // Weight Stats
    const flockWeights = (weightRecords || [])
      .filter(w => (typeof w.flock_id === 'object' ? w.flock_id.id : w.flock_id) === flock.id)
      .sort((a, b) => b.week - a.week);
    
    const latestWeight = flockWeights[0];
    let weightStats = null;

    if (latestWeight) {
      const standard = (weightStandards || []).find(s => s.breed === flock.breed && s.week === latestWeight.week);
      
      const maleDiff = standard?.standard_weight_male ? ((latestWeight.actual_weight_male - standard.standard_weight_male) / standard.standard_weight_male) * 100 : 0;
      const femaleDiff = standard?.standard_weight_female ? ((latestWeight.actual_weight_female - standard.standard_weight_female) / standard.standard_weight_female) * 100 : 0;

      weightStats = {
        week: latestWeight.week,
        male: latestWeight.actual_weight_male,
        female: latestWeight.actual_weight_female,
        maleStandard: standard?.standard_weight_male || 0,
        femaleStandard: standard?.standard_weight_female || 0,
        maleDiff,
        femaleDiff
      };
    }

    return { 
      ageWeeks, 
      maleEnding, 
      femaleEnding, 
      totalEnding, 
      maleLivability, 
      femaleLivability, 
      totalLivability,
      maleBeginning,
      femaleBeginning,
      maleToFemaleRatio,
      totalMortality,
      totalSpotCull,
      totalMissex,
      totalSpentCull,
      weightStats
    };
  };

  const handleExportFlocks = () => {
    const exportData = flocks.map(flock => {
      const stats = calculateStats(flock);
      return {
        'House Number': flock.house_number,
        'Breed': flock.breed,
        'Loading Date': flock.loading_date,
        'Beginning Male': flock.beginning_male,
        'Beginning Female': flock.beginning_female,
        'Total Beginning': flock.beginning_male + flock.beginning_female,
        'Current Male': stats.maleEnding,
        'Current Female': stats.femaleEnding,
        'Total Current': stats.totalEnding,
        'M:F Ratio (%)': stats.maleToFemaleRatio,
        'Age (Weeks)': stats.ageWeeks,
        'Male Livability (%)': stats.maleLivability,
        'Female Livability (%)': stats.femaleLivability,
        'Total Livability (%)': stats.totalLivability
      };
    });
    exportToExcel(exportData, 'Flock_Records');
  };

  const handleExportTransfers = () => {
    const exportData = transfers.map(t => ({
      'Date': t.date,
      'From House': `House #${t.from_house}`,
      'To House': `House #${t.to_house}`,
      'Male Count': t.male_count,
      'Female Count': t.female_count,
      'Total Birds': t.male_count + t.female_count,
      'Reason': t.reason,
      'Reported By': t.reported_by
    }));
    exportToExcel(exportData, 'Bird_Transfers');
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Flock Management
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Track and manage your poultry flocks across different houses with real-time population and livability metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportFlocks}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export
          </button>
          <button 
            onClick={() => {
              setEditingFlock(null);
              setFormData({
                house_number: '',
                beginning_male: 0,
                beginning_female: 0,
                loading_date: new Date().toISOString().split('T')[0],
                breed: ''
              });
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> Add New Flock
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {flocks.length > 0 && (
        <div className="flex flex-wrap gap-2 p-1 bg-stone-100/50 rounded-2xl w-fit mb-8">
          {flocks.map((flock: any) => (
            <button
              key={flock.id}
              onClick={() => setActiveTab(flock.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-200 ${
                (activeTab === flock.id || (!activeTab && flocks[0].id === flock.id))
                  ? 'bg-white text-brand-600 shadow-sm ring-1 ring-stone-200'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
              }`}
            >
              House #{flock.house_number}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {flocks
          .filter((f: any) => !activeTab ? f.id === flocks[0]?.id : f.id === activeTab)
          .map((flock: any) => {
            const stats = calculateStats(flock);
            return (
              <motion.div 
                key={flock.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center space-x-5">
                    <div className="p-4 bg-brand-50 rounded-2xl text-brand-600 shadow-inner">
                      <Bird size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-stone-900 tracking-tight">House #{flock.house_number}</h3>
                      <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">{flock.breed} • {flock.loading_date}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setEditingFlock(flock);
                        setFormData({
                          house_number: flock.house_number,
                          beginning_male: flock.beginning_male,
                          beginning_female: flock.beginning_female,
                          loading_date: flock.loading_date,
                          breed: flock.breed
                        });
                        setIsModalOpen(true);
                      }}
                      className="btn-secondary p-2.5"
                      title="Edit House"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        setTransferData({
                          from_flock_id: flock.id,
                          date: new Date().toISOString().split('T')[0],
                          reason: '',
                          reported_by: user.fullName,
                          destinations: [
                            { to_flock_id: '', male_count: 0, female_count: 0 }
                          ]
                        });
                        setIsTransferModalOpen(true);
                      }}
                      className="btn-secondary p-2.5"
                      title="Transfer Birds"
                    >
                      <ArrowRightLeft size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-[0.2em] mb-2">Age</p>
                    <p className="text-2xl font-black text-brand-600 tracking-tight">{stats.ageWeeks} <span className="text-xs font-bold text-stone-400">Weeks</span></p>
                  </div>
                  <div className="p-6 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                    <p className="text-[10px] text-blue-400 uppercase font-black tracking-[0.2em] mb-2">Male Pop</p>
                    <p className="text-2xl font-black text-blue-600 tracking-tight">{stats.maleEnding.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">{stats.maleLivability}% Livability</p>
                  </div>
                  <div className="p-6 bg-pink-50/30 rounded-2xl border border-pink-100/50">
                    <p className="text-[10px] text-pink-400 uppercase font-black tracking-[0.2em] mb-2">Female Pop</p>
                    <p className="text-2xl font-black text-pink-600 tracking-tight">{stats.femaleEnding.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mt-1">{stats.femaleLivability}% Livability</p>
                  </div>
                  <div className="p-6 bg-stone-900 rounded-2xl shadow-lg shadow-stone-200">
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-[0.2em] mb-2">Total Pop</p>
                    <p className="text-2xl font-black text-white tracking-tight">{stats.totalEnding.toLocaleString()}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">{stats.totalLivability}% Livability</p>
                  </div>
                  <div className="p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                    <p className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em] mb-2">M:F Ratio</p>
                    <p className="text-2xl font-black text-indigo-600 tracking-tight">{stats.maleToFemaleRatio}%</p>
                    <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${stats.maleToFemaleRatio}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100">
                    <p className="text-[10px] text-rose-400 uppercase font-black tracking-widest mb-2">Total Mortality</p>
                    <p className="text-xl font-black text-rose-600">{stats.totalMortality.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] text-amber-400 uppercase font-black tracking-widest mb-2">Total Spot Cull</p>
                    <p className="text-xl font-black text-amber-600">{stats.totalSpotCull.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mb-2">Total Missex</p>
                    <p className="text-xl font-black text-indigo-600">{stats.totalMissex.toLocaleString()}</p>
                  </div>
                  <div className="p-5 bg-stone-50/50 rounded-2xl border border-stone-100">
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest mb-2">Total Spent Cull</p>
                    <p className="text-xl font-black text-stone-600">{stats.totalSpentCull.toLocaleString()}</p>
                  </div>
                </div>

                {stats.weightStats && (
                  <div className="pt-8 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                          <Scale size={20} />
                        </div>
                        <h4 className="font-black text-lg text-stone-900 tracking-tight">Weekly Weight <span className="text-stone-400 font-bold ml-2">Week {stats.weightStats.week}</span></h4>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-blue-50/20 rounded-2xl border border-blue-100/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-1">Male Weight</p>
                          <p className="text-2xl font-black text-blue-600">{stats.weightStats.male}g</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-1">Std: {stats.weightStats.maleStandard}g</p>
                        </div>
                        <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${stats.weightStats.maleDiff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {stats.weightStats.maleDiff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span className="text-xs font-black">{Math.abs(stats.weightStats.maleDiff).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="p-6 bg-pink-50/20 rounded-2xl border border-pink-100/30 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-pink-400 uppercase font-black tracking-widest mb-1">Female Weight</p>
                          <p className="text-2xl font-black text-pink-600">{stats.weightStats.female}g</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-1">Std: {stats.weightStats.femaleStandard}g</p>
                        </div>
                        <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${stats.weightStats.femaleDiff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {stats.weightStats.femaleDiff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span className="text-xs font-black">{Math.abs(stats.weightStats.femaleDiff).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Status</p>
                      <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full w-fit ${flock.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                        {flock.status}
                      </span>
                    </div>
                    <div className="w-px h-10 bg-stone-100" />
                    <div className="flex flex-col">
                      <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Loading Date</p>
                      <p className="text-xs font-black text-stone-600">{new Date(flock.loading_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">{editingFlock ? 'Edit Flock' : 'Add New Flock'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">House Number</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.house_number}
                  onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beginning Male</label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    value={isNaN(formData.beginning_male) ? '' : formData.beginning_male}
                    onChange={(e) => setFormData({ ...formData, beginning_male: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beginning Female</label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    value={isNaN(formData.beginning_female) ? '' : formData.beginning_female}
                    onChange={(e) => setFormData({ ...formData, beginning_female: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loading Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={formData.loading_date}
                  onChange={(e) => setFormData({ ...formData, loading_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Save Flock</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Transfer Birds</h2>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From House</label>
                  <input
                    type="text"
                    disabled
                    className="input-field bg-slate-50"
                    value={`House #${flocks.find(f => f.id === transferData.from_flock_id)?.house_number}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Date</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={transferData.date}
                    onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <h3 className="font-black text-stone-900 uppercase tracking-widest text-xs">Destinations</h3>
                  <button 
                    type="button"
                    onClick={addDestination}
                    className="text-brand-600 hover:text-brand-700 text-xs font-black flex items-center"
                  >
                    <Plus size={14} className="mr-1" /> Add House
                  </button>
                </div>

                <div className="space-y-4">
                  {transferData.destinations.map((dest, index) => (
                    <div key={index} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 relative group">
                      {transferData.destinations.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeDestination(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus size={14} className="rotate-45" />
                        </button>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">To House</label>
                          <select 
                            required 
                            className="input-field text-sm"
                            value={dest.to_flock_id}
                            onChange={(e) => updateDestination(index, 'to_flock_id', e.target.value)}
                          >
                            <option value="">Select House</option>
                            {flocks
                              .filter(f => f.id !== transferData.from_flock_id && f.status === 'active')
                              .map(f => (
                                <option key={f.id} value={f.id}>House #{f.house_number}</option>
                              ))
                            }
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Male Count</label>
                          <input
                            type="number"
                            required
                            className="input-field text-sm"
                            value={isNaN(dest.male_count) ? '' : dest.male_count}
                            onChange={(e) => updateDestination(index, 'male_count', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Female Count</label>
                          <input
                            type="number"
                            required
                            className="input-field text-sm"
                            value={isNaN(dest.female_count) ? '' : dest.female_count}
                            onChange={(e) => updateDestination(index, 'female_count', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  className="input-field"
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  placeholder="e.g., Space management, thinning out"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Process Transfers</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {transfers.length > 0 && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recent Transfers</h2>
            <button 
              onClick={handleExportTransfers}
              className="text-sm font-bold text-pastel-green-700 hover:text-pastel-green-800 flex items-center"
            >
              <Download size={16} className="mr-2" /> Export Transfers
            </button>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-pastel-green-50 text-pastel-green-800 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">From</th>
                    <th className="px-6 py-4">To</th>
                    <th className="px-6 py-4">Birds (M/F)</th>
                    <th className="px-6 py-4">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pastel-green-50">
                  {transfers.slice().reverse().map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-pastel-green-50/50 transition-colors">
                      <td className="px-6 py-4">{transfer.date}</td>
                      <td className="px-6 py-4">House #{transfer.from_house}</td>
                      <td className="px-6 py-4">House #{transfer.to_house}</td>
                      <td className="px-6 py-4 font-bold">{transfer.male_count} / {transfer.female_count}</td>
                      <td className="px-6 py-4 text-slate-500">{transfer.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
