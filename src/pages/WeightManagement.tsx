import React, { useState } from 'react';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Upload, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

export default function WeightManagement({ user }: { user: any }) {
  const { data: flocks } = useApi<any>('/api/flocks');
  const { data: standards, refresh: refreshStandards } = useApi<any>('/api/weight-standards');
  const { data: records, refresh: refreshRecords } = useApi<any>('/api/weight-records');

  const [activeTab, setActiveTab] = useState<'records' | 'standards'>('records');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isStandardModalOpen, setIsStandardModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadBreed, setUploadBreed] = useState('Cobb');

  const [recordForm, setRecordForm] = useState({
    flock_id: '',
    week: 1,
    actual_weight_male: 0,
    actual_weight_female: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [standardForm, setStandardForm] = useState({
    breed: 'Cobb',
    week: 1,
    standard_weight_male: 0,
    standard_weight_female: 0
  });

  const [batchForm, setBatchForm] = useState({
    breed: 'Cobb',
    data: ''
  });

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/weight-records', {
        method: 'POST',
        body: JSON.stringify({ ...recordForm, reported_by: user.fullName }),
      });
      setIsRecordModalOpen(false);
      refreshRecords();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/weight-standards', {
        method: 'POST',
        body: JSON.stringify(standardForm),
      });
      setIsStandardModalOpen(false);
      refreshStandards();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if it exists (check if first line contains non-numeric week)
        const firstLine = lines[0].split(/[\t,]/);
        const startIdx = isNaN(Number(firstLine[0].trim())) ? 1 : 0;

        const parsedStandards = lines.slice(startIdx).map(line => {
          const [week, male, female] = line.split(/[\t,]/).map(v => v.trim());
          if (!week || isNaN(Number(week))) throw new Error(`Invalid week in line: ${line}`);
          return {
            week: Number(week),
            standard_weight_male: Number(male) || 0,
            standard_weight_female: Number(female) || 0
          };
        });

        await apiFetch('/api/weight-standards/batch', {
          method: 'POST',
          body: JSON.stringify({
            breed: uploadBreed,
            standards: parsedStandards
          }),
        });
        setIsUploadModalOpen(false);
        setUploadFile(null);
        refreshStandards();
      } catch (err: any) {
        setError(err.message);
      }
    };
    reader.readAsText(uploadFile);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await apiFetch(`/api/weight-records/${id}`, { method: 'DELETE' });
      refreshRecords();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const calculateDiff = (actual: number, standard: number) => {
    if (!standard) return 0;
    return ((actual - standard) / standard) * 100;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-stone-900 mb-2">Weight Management</h1>
          <p className="text-stone-400 font-medium">Monitor flock growth performance against breed standards.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveTab('records')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'records' ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
          >
            Weekly Records
          </button>
          <button 
            onClick={() => setActiveTab('standards')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'standards' ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
          >
            Breed Standards
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
      )}

      {activeTab === 'records' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsRecordModalOpen(true)}
              className="btn-primary flex items-center"
            >
              <Plus size={18} className="mr-2" /> Log Weekly Weight
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(records || []).map((record: any) => {
              const flock = flocks?.find((f: any) => (f.id || f._id) === (record.flock_id?.id || record.flock_id?._id || record.flock_id));
              const standard = standards?.find((s: any) => s.breed === flock?.breed && s.week === record.week);
              
              const maleDiff = calculateDiff(record.actual_weight_male, standard?.standard_weight_male);
              const femaleDiff = calculateDiff(record.actual_weight_female, standard?.standard_weight_female);

              return (
                <motion.div 
                  key={record._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
                        <Scale size={24} />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-stone-900">House #{flock?.house_number} • Week {record.week}</h3>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{record.date}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-2 gap-8 flex-1 max-w-2xl">
                      <div className="space-y-1">
                        <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Male Weight</p>
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-black text-blue-600">{record.actual_weight_male}g</span>
                          {standard && (
                            <div className={`flex items-center text-xs font-bold ${maleDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {maleDiff >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                              {Math.abs(maleDiff).toFixed(1)}%
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-stone-300 uppercase">Std: {standard?.standard_weight_male || 0}g</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">Female Weight</p>
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-black text-pink-600">{record.actual_weight_female}g</span>
                          {standard && (
                            <div className={`flex items-center text-xs font-bold ${femaleDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {femaleDiff >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                              {Math.abs(femaleDiff).toFixed(1)}%
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-stone-300 uppercase">Std: {standard?.standard_weight_female || 0}g</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteRecord(record._id)}
                      className="p-2 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-secondary flex items-center"
            >
              <Upload size={18} className="mr-2" /> Batch Upload
            </button>
            <button 
              onClick={() => setIsStandardModalOpen(true)}
              className="btn-primary flex items-center"
            >
              <Plus size={18} className="mr-2" /> Add Standard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['Cobb', 'Ross'].map(breed => (
              <div key={breed} className="space-y-4">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center text-white font-black">
                    {breed[0]}
                  </div>
                  <h2 className="text-2xl font-black text-stone-900">{breed} Standards</h2>
                </div>
                
                <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Week</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Male (g)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Female (g)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {(standards || [])
                        .filter((s: any) => s.breed === breed)
                        .sort((a: any, b: any) => a.week - b.week)
                        .map((s: any) => (
                          <tr key={s._id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-6 py-4 font-black text-stone-600">Week {s.week}</td>
                            <td className="px-6 py-4 font-bold text-blue-600">{s.standard_weight_male}g</td>
                            <td className="px-6 py-4 font-bold text-pink-600">{s.standard_weight_female}g</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black text-stone-900 mb-6">Log Weekly Weight</h2>
              <form onSubmit={handleRecordSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Select House</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                    value={recordForm.flock_id}
                    onChange={e => setRecordForm({ ...recordForm, flock_id: e.target.value })}
                  >
                    <option value="">Choose a house...</option>
                    {flocks?.map((f: any) => (
                      <option key={f.id || f._id} value={f.id || f._id}>House #{f.house_number} ({f.breed})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Week Number</label>
                    <input 
                      type="number" required min="1"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                      value={isNaN(recordForm.week) ? '' : recordForm.week}
                      onChange={e => setRecordForm({ ...recordForm, week: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" required
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                      value={recordForm.date}
                      onChange={e => setRecordForm({ ...recordForm, date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 text-blue-500">Male Weight (g)</label>
                    <input 
                      type="number" required step="0.01"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      value={isNaN(recordForm.actual_weight_male) ? '' : recordForm.actual_weight_male}
                      onChange={e => setRecordForm({ ...recordForm, actual_weight_male: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 text-pink-500">Female Weight (g)</label>
                    <input 
                      type="number" required step="0.01"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                      value={isNaN(recordForm.actual_weight_female) ? '' : recordForm.actual_weight_female}
                      onChange={e => setRecordForm({ ...recordForm, actual_weight_female: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsRecordModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 rounded-xl font-bold bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors">Save Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isStandardModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black text-stone-900 mb-6">Set Breed Standard</h2>
              <form onSubmit={handleStandardSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Breed</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                    value={standardForm.breed}
                    onChange={e => setStandardForm({ ...standardForm, breed: e.target.value })}
                  >
                    <option value="Cobb">Cobb</option>
                    <option value="Ross">Ross</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Week Number</label>
                  <input 
                    type="number" required min="1"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                    value={isNaN(standardForm.week) ? '' : standardForm.week}
                    onChange={e => setStandardForm({ ...standardForm, week: parseInt(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 text-blue-500">Male Std (g)</label>
                    <input 
                      type="number" required step="0.01"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      value={isNaN(standardForm.standard_weight_male) ? '' : standardForm.standard_weight_male}
                      onChange={e => setStandardForm({ ...standardForm, standard_weight_male: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 text-pink-500">Female Std (g)</label>
                    <input 
                      type="number" required step="0.01"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                      value={isNaN(standardForm.standard_weight_female) ? '' : standardForm.standard_weight_female}
                      onChange={e => setStandardForm({ ...standardForm, standard_weight_female: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsStandardModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-6 py-3 rounded-xl font-bold bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors">Save Standard</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-900">Batch Upload Standards</h2>
                <button 
                  onClick={() => {
                    const csvContent = "Week,Male Weight (g),Female Weight (g)\n1,150,140\n2,350,320\n3,600,550";
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'breed_standards_template.csv';
                    a.click();
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center"
                >
                  <FileText size={14} className="mr-1" /> Download Template
                </button>
              </div>
              
              <form onSubmit={handleUploadSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Breed</label>
                  <select 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-brand-500 outline-none font-bold"
                    value={uploadBreed}
                    onChange={e => setUploadBreed(e.target.value)}
                  >
                    <option value="Cobb">Cobb</option>
                    <option value="Ross">Ross</option>
                  </select>
                </div>

                <div className="relative group">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${uploadFile ? 'border-brand-500 bg-brand-50/30' : 'border-stone-200 group-hover:border-brand-300 group-hover:bg-stone-50'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${uploadFile ? 'bg-brand-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-bold text-stone-900 mb-1">
                      {uploadFile ? uploadFile.name : 'Click or drag CSV file here'}
                    </p>
                    <p className="text-xs text-stone-400 font-medium">
                      CSV or Text files only
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadFile(null);
                    }} 
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!uploadFile}
                    className="flex-1 px-6 py-3 rounded-xl font-bold bg-brand-600 text-white shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload & Process
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
