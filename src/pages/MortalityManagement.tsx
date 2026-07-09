import React, { useState } from 'react';
import { Skull, Plus, User, Download, Edit2, Upload, Clock, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';
import { exportToExcel } from '../utils/excelExport';
import * as XLSX from 'xlsx';

export default function MortalityManagement({ user }: { user: any }) {
  const { data: allRecords, loading: recordsLoading, refresh: refreshRecords } = useApi<any>('/api/mortality');
  const { data: allFlocks, loading: flocksLoading } = useApi<any>('/api/flocks');
  
  const flocks = user.assigned_flock_id 
    ? (allFlocks || []).filter((f: any) => f.id === user.assigned_flock_id)
    : (allFlocks || []);
    
  const records = user.assigned_flock_id
    ? (allRecords || []).filter((r: any) => {
        const rFlockId = (r.flock_id && typeof r.flock_id === 'object') ? (r.flock_id.id || r.flock_id._id) : r.flock_id;
        return rFlockId === user.assigned_flock_id;
      })
    : (allRecords || []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    flock_id: '',
    date: new Date().toISOString().split('T')[0],
    male_mortality: 0,
    female_mortality: 0,
    male_spot_cull: 0,
    female_spot_cull: 0,
    male_spent_cull: 0,
    female_spent_cull: 0,
    male_missex: 0,
    female_missex: 0,
    reported_by: user.fullName
  });

  const canEdit = user.role === 'admin' || user.role === 'manager' || user.role === 'supervisor' || user.role === 'flock_man';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/api/mortality/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/mortality', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      handleCloseModal();
      refreshRecords();
    } catch (err) {
      console.error('Failed to save mortality record:', err);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({
      flock_id: record.flock_id,
      date: record.date,
      male_mortality: record.male_mortality,
      female_mortality: record.female_mortality,
      male_spot_cull: record.male_spot_cull,
      female_spot_cull: record.female_spot_cull,
      male_spent_cull: record.male_spent_cull,
      female_spent_cull: record.female_spent_cull,
      male_missex: record.male_missex,
      female_missex: record.female_missex,
      reported_by: record.reported_by
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      flock_id: '',
      date: new Date().toISOString().split('T')[0],
      male_mortality: 0,
      female_mortality: 0,
      male_spot_cull: 0,
      female_spot_cull: 0,
      male_spent_cull: 0,
      female_spent_cull: 0,
      male_missex: 0,
      female_missex: 0,
      reported_by: user.fullName
    });
  };

  const handleExport = () => {
    const exportData = records.map(record => ({
      'Date': record.date,
      'House Number': record.house_number,
      'Male Mortality': record.male_mortality,
      'Female Mortality': record.female_mortality,
      'Male Spot Cull': record.male_spot_cull,
      'Female Spot Cull': record.female_spot_cull,
      'Male Spent Cull': record.male_spent_cull,
      'Female Spent Cull': record.female_spent_cull,
      'Male Missex': record.male_missex,
      'Female Missex': record.female_missex,
      'Total Mortality/Cull': record.male_mortality + record.female_mortality + record.male_spot_cull + record.female_spot_cull + record.male_spent_cull + record.female_spent_cull + record.male_missex + record.female_missex,
      'Reported By': record.reported_by
    }));
    exportToExcel(exportData, 'Mortality_Records');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedRecords = data.map(row => {
          // Find flock by house number
          const flock = flocks.find((f: any) => 
            f.house_number.toString() === (row['House Number'] || row['House #'] || '').toString()
          );

          if (!flock) {
            console.warn(`Flock not found for house: ${row['House Number'] || row['House #']}`);
            return null;
          }

          return {
            flock_id: flock.id,
            date: row['Date'] || new Date().toISOString().split('T')[0],
            male_mortality: parseInt(row['Male Mortality'] || 0),
            female_mortality: parseInt(row['Female Mortality'] || 0),
            male_spot_cull: parseInt(row['Male Spot Cull'] || 0),
            female_spot_cull: parseInt(row['Female Spot Cull'] || 0),
            male_spent_cull: parseInt(row['Male Spent Cull'] || 0),
            female_spent_cull: parseInt(row['Female Spent Cull'] || 0),
            male_missex: parseInt(row['Male Missex'] || 0),
            female_missex: parseInt(row['Female Missex'] || 0),
            reported_by: row['Reported By'] || user.fullName
          };
        }).filter(Boolean);

        if (formattedRecords.length > 0) {
          await apiFetch('/api/mortality/batch', {
            method: 'POST',
            body: JSON.stringify({ records: formattedRecords }),
          });
          refreshRecords();
          alert(`Successfully imported ${formattedRecords.length} records.`);
        } else {
          alert('No valid records found in the file. Please check the column headers.');
        }
      } catch (err) {
        console.error('Failed to import mortality records:', err);
        alert('Failed to import records. Please check the file format.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  // Sort records by date descending (latest first)
  const sortedRecords = [...records].sort((a: any, b: any) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return (b.id || '').localeCompare(a.id || '');
  });

  const latestRecord = sortedRecords[0] || null;

  // Calculate stats for display
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // "YYYY-MM"
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  const currentMonthRecords = records.filter((r: any) => r.date.startsWith(currentMonthStr));
  
  const monthlyTotalMortality = currentMonthRecords.reduce((sum: number, r: any) => sum + (r.male_mortality || 0) + (r.female_mortality || 0), 0);
  const monthlyTotalCulls = currentMonthRecords.reduce((sum: number, r: any) => sum + (r.male_spot_cull || 0) + (r.female_spot_cull || 0) + (r.male_spent_cull || 0) + (r.female_spent_cull || 0), 0);
  const monthlyTotalDepletion = currentMonthRecords.reduce((sum: number, r: any) => {
    return sum + (r.male_mortality || 0) + (r.female_mortality || 0) +
                 (r.male_spot_cull || 0) + (r.female_spot_cull || 0) +
                 (r.male_spent_cull || 0) + (r.female_spent_cull || 0) +
                 (r.male_missex || 0) + (r.female_missex || 0);
  }, 0);

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Mortality Management
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Monitor and record bird mortality and culling to maintain flock health and operational efficiency.
            <span className="block mt-2 text-[10px] text-stone-300 italic">Tip: Use the "Export" file as a template for "Batch Upload".</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            id="batch-upload" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="batch-upload"
            className="btn-secondary flex items-center group cursor-pointer"
          >
            <Upload size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Batch Upload
          </label>
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> Record Mortality
          </button>
        </div>
      </header>

      {/* Latest Update Display & KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Latest Logged Update */}
        <div className="md:col-span-2 card p-6 bg-gradient-to-br from-rose-50/10 via-white to-stone-50/30 border border-stone-150 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Clock size={16} className="animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">
                  Latest Logged Update
                </span>
              </div>
              {latestRecord && (
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-100 text-rose-700 font-bold flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                  </span>
                  Newest
                </span>
              )}
            </div>

            {latestRecord ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-stone-800">
                      House #{latestRecord.house_number}
                    </h3>
                    <p className="text-xs text-stone-400 font-semibold">{latestRecord.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-rose-600">
                      {(
                        (latestRecord.male_mortality || 0) +
                        (latestRecord.female_mortality || 0) +
                        (latestRecord.male_spot_cull || 0) +
                        (latestRecord.female_spot_cull || 0) +
                        (latestRecord.male_spent_cull || 0) +
                        (latestRecord.female_spent_cull || 0) +
                        (latestRecord.male_missex || 0) +
                        (latestRecord.female_missex || 0)
                      ).toLocaleString()}
                    </span>
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Total Depleted</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-stone-100">
                  <div className="bg-stone-50 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-bold text-slate-500 block">Mortality</span>
                    <span className="text-xs font-black text-rose-600">
                      {((latestRecord.male_mortality || 0) + (latestRecord.female_mortality || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-bold text-slate-500 block">Culls</span>
                    <span className="text-xs font-black text-amber-600">
                      {(
                        (latestRecord.male_spot_cull || 0) +
                        (latestRecord.female_spot_cull || 0) +
                        (latestRecord.male_spent_cull || 0) +
                        (latestRecord.female_spent_cull || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-2 text-center">
                    <span className="text-[9px] font-bold text-slate-500 block">Missex</span>
                    <span className="text-xs font-black text-blue-600">
                      {((latestRecord.male_missex || 0) + (latestRecord.female_missex || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-stone-400 text-xs font-medium">
                No records recorded yet
              </div>
            )}
          </div>

          {latestRecord && (
            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-bold">
              <span className="flex items-center gap-1">
                <User size={12} className="text-stone-400" />
                Reported by {latestRecord.reported_by}
              </span>
              {canEdit && (
                <button
                  onClick={() => {
                    const actualFlockId = (latestRecord.flock_id && typeof latestRecord.flock_id === 'object') 
                      ? (latestRecord.flock_id.id || latestRecord.flock_id._id) 
                      : latestRecord.flock_id;
                    setEditingId(latestRecord.id);
                    setFormData({
                      flock_id: actualFlockId || '',
                      date: latestRecord.date,
                      male_mortality: latestRecord.male_mortality || 0,
                      female_mortality: latestRecord.female_mortality || 0,
                      male_spot_cull: latestRecord.male_spot_cull || 0,
                      female_spot_cull: latestRecord.female_spot_cull || 0,
                      male_spent_cull: latestRecord.male_spent_cull || 0,
                      female_spent_cull: latestRecord.female_spent_cull || 0,
                      male_missex: latestRecord.male_missex || 0,
                      female_missex: latestRecord.female_missex || 0,
                      reported_by: latestRecord.reported_by
                    });
                    setIsModalOpen(true);
                  }}
                  className="text-pastel-green-600 hover:text-pastel-green-700 hover:underline flex items-center gap-0.5"
                >
                  Edit Latest <Edit2 size={10} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Cumulative Monthly Mortality */}
        <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-stone-400 mb-2">
              <Skull size={14} className="text-rose-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {currentMonthName} Mortality
              </p>
            </div>
            <p className="text-2xl font-black text-rose-600">
              {monthlyTotalMortality.toLocaleString()}
            </p>
          </div>
          <p className="text-[9px] text-stone-400 font-semibold mt-2">
            Total bird deaths for {currentMonthName} {currentYear}
          </p>
        </div>

        {/* Card 3: Cumulative Monthly Culls */}
        <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-stone-400 mb-2">
              <TrendingDown size={14} className="text-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                {currentMonthName} Culls
              </p>
            </div>
            <p className="text-2xl font-black text-amber-600">
              {monthlyTotalCulls.toLocaleString()}
            </p>
          </div>
          <p className="text-[9px] text-stone-400 font-semibold mt-2">
            Spot & spent culls for {currentMonthName}
          </p>
        </div>

        {/* Card 4: Total Month Depletion */}
        <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-stone-400 mb-2">
              <div className="w-2 h-2 rounded-full bg-stone-500" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Total Month Depletion
              </p>
            </div>
            <p className="text-2xl font-black text-stone-800">
              {monthlyTotalDepletion.toLocaleString()}
            </p>
          </div>
          <p className="text-[9px] text-stone-400 font-semibold mt-2">
            All depravations combined ({currentMonthName})
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-pastel-green-50 text-pastel-green-800 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">House #</th>
                <th className="px-6 py-4 text-center">Mortality</th>
                <th className="px-6 py-4 text-center">Spot Cull</th>
                <th className="px-6 py-4 text-center">Spent Cull</th>
                <th className="px-6 py-4 text-center">Missex</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Reported By</th>
                {canEdit && <th className="px-6 py-4">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-pastel-green-50">
              {sortedRecords.map((record, index) => {
                const total = (record.male_mortality || 0) + (record.female_mortality || 0) + (record.male_spot_cull || 0) + (record.female_spot_cull || 0) + (record.male_spent_cull || 0) + (record.female_spent_cull || 0) + (record.male_missex || 0) + (record.female_missex || 0);
                const isNewest = index === 0;
                return (
                  <tr key={record.id} className={`hover:bg-pastel-green-50/50 transition-colors ${isNewest ? 'bg-rose-50/10' : ''}`}>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{record.date}</span>
                        {isNewest && (
                          <span className="relative flex h-2 w-2" title="Latest logged update">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">House #{record.house_number}</td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-blue-600 font-medium">M: {record.male_mortality}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-pink-600 font-medium">F: {record.female_mortality}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-blue-600 font-medium">M: {record.male_spot_cull}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-pink-600 font-medium">F: {record.female_spot_cull}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-blue-600 font-medium">M: {record.male_spent_cull}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-pink-600 font-medium">F: {record.female_spent_cull}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="text-blue-600 font-medium">M: {record.male_missex}</span>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-pink-600 font-medium">F: {record.female_missex}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">{total}</td>
                    <td className="px-6 py-4 flex items-center">
                      <User size={14} className="mr-1 text-slate-400" /> {record.reported_by}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleEdit(record)}
                          className="p-2 text-pastel-green-600 hover:bg-pastel-green-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Mortality / Cull' : 'Log Mortality / Cull'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">House / Flock</label>
                  <select 
                    required 
                    className="input-field" 
                    value={formData.flock_id}
                    onChange={(e) => setFormData({ ...formData, flock_id: e.target.value })}
                  >
                    <option value="">Select House</option>
                    {flocks.map(f => <option key={f.id} value={f.id}>House #{f.house_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-pastel-green-100 pb-2">
                    <h3 className="font-bold text-pastel-green-700">Mortality</h3>
                    <div className="flex space-x-12 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Male</span>
                      <span>Female</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Male" className="input-field" value={isNaN(formData.male_mortality) ? '' : formData.male_mortality} onChange={(e) => setFormData({ ...formData, male_mortality: parseInt(e.target.value) })} />
                    <input type="number" placeholder="Female" className="input-field" value={isNaN(formData.female_mortality) ? '' : formData.female_mortality} onChange={(e) => setFormData({ ...formData, female_mortality: parseInt(e.target.value) })} />
                  </div>
                  
                  <div className="flex justify-between items-center border-b border-pastel-green-100 pb-2">
                    <h3 className="font-bold text-pastel-green-700">Spot Cull</h3>
                    <div className="flex space-x-12 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Male</span>
                      <span>Female</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Male" className="input-field" value={isNaN(formData.male_spot_cull) ? '' : formData.male_spot_cull} onChange={(e) => setFormData({ ...formData, male_spot_cull: parseInt(e.target.value) })} />
                    <input type="number" placeholder="Female" className="input-field" value={isNaN(formData.female_spot_cull) ? '' : formData.female_spot_cull} onChange={(e) => setFormData({ ...formData, female_spot_cull: parseInt(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-pastel-green-100 pb-2">
                    <h3 className="font-bold text-pastel-green-700">Spent Cull</h3>
                    <div className="flex space-x-12 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Male</span>
                      <span>Female</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Male" className="input-field" value={isNaN(formData.male_spent_cull) ? '' : formData.male_spent_cull} onChange={(e) => setFormData({ ...formData, male_spent_cull: parseInt(e.target.value) })} />
                    <input type="number" placeholder="Female" className="input-field" value={isNaN(formData.female_spent_cull) ? '' : formData.female_spent_cull} onChange={(e) => setFormData({ ...formData, female_spent_cull: parseInt(e.target.value) })} />
                  </div>

                  <div className="flex justify-between items-center border-b border-pastel-green-100 pb-2">
                    <h3 className="font-bold text-pastel-green-700">Missex</h3>
                    <div className="flex space-x-12 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Male</span>
                      <span>Female</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Male" className="input-field" value={isNaN(formData.male_missex) ? '' : formData.male_missex} onChange={(e) => setFormData({ ...formData, male_missex: parseInt(e.target.value) })} />
                    <input type="number" placeholder="Female" className="input-field" value={isNaN(formData.female_missex) ? '' : formData.female_missex} onChange={(e) => setFormData({ ...formData, female_missex: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editingId ? 'Update Record' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
