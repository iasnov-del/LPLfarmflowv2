import React, { useState, useEffect } from 'react';
import { Beef, Plus, ArrowDownCircle, ArrowUpCircle, Download, Upload, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';
import { exportToExcel } from '../utils/excelExport';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FeedManagement({ user }: { user: any }) {
  const { data: inventory, refresh: refreshInventory } = useApi<any[]>('/api/feed-inventory');
  const { data: feedTypes, refresh: refreshFeedTypes } = useApi<any[]>('/api/feed-types');
  const { data: allFlocks } = useApi<any[]>('/api/flocks');
  const { data: incomingHistory, refresh: refreshIncomingHistory } = useApi<any[]>('/api/feed-incoming');
  const { data: allConsumptionHistory, refresh: refreshConsumptionHistory } = useApi<any[]>('/api/feed-consumption');

  const flocks = user.assigned_flock_id 
    ? (allFlocks || []).filter((f: any) => f.id === user.assigned_flock_id)
    : (allFlocks || []);
    
  const consumptionHistory = user.assigned_flock_id
    ? (allConsumptionHistory || []).filter((r: any) => {
        const rFlockId = (r.flock_id && typeof r.flock_id === 'object') ? (r.flock_id.id || r.flock_id._id) : r.flock_id;
        return rFlockId === user.assigned_flock_id;
      })
    : (allConsumptionHistory || []);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditIncomingModalOpen, setIsEditIncomingModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editIncomingData, setEditIncomingData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'consumption' | 'reconciliation'>('incoming');

  const reconciliationData = (inventory || []).map(item => {
    const typeId = (item.feed_type_id && typeof item.feed_type_id === 'object') 
      ? (item.feed_type_id.id || item.feed_type_id._id).toString()
      : (item.feed_type_id?.toString());
    
    const totalIncoming = (incomingHistory || [])
      .filter(r => {
        const rTypeId = (r.feed_type_id && typeof r.feed_type_id === 'object') 
          ? (r.feed_type_id.id || r.feed_type_id._id).toString()
          : (r.feed_type_id?.toString());
        return rTypeId === typeId;
      })
      .reduce((acc, r) => acc + (r.quantity_kg || 0), 0);
      
    const totalConsumption = (allConsumptionHistory || [])
      .reduce((acc, r) => {
        let sum = acc;
        const rMaleId = (r.feed_type_male_id && typeof r.feed_type_male_id === 'object') 
          ? (r.feed_type_male_id.id || r.feed_type_male_id._id).toString()
          : (r.feed_type_male_id?.toString());
        const rFemaleId = (r.feed_type_female_id && typeof r.feed_type_female_id === 'object') 
          ? (r.feed_type_female_id.id || r.feed_type_female_id._id).toString()
          : (r.feed_type_female_id?.toString());
        
        if (rMaleId === typeId) {
          sum += (r.quantity_male_kg || 0);
        }
        if (rFemaleId === typeId) {
          sum += (r.quantity_female_kg || 0);
        }
        return sum;
      }, 0);
      
    const expectedStock = Math.round((item.beginning_stock + totalIncoming - totalConsumption) * 100) / 100;
    const variance = Math.round((item.current_stock - expectedStock) * 100) / 100;
    
    return {
      ...item,
      totalIncoming,
      totalConsumption,
      expectedStock,
      variance
    };
  });

  const totalStock = (inventory || []).reduce((acc, item) => acc + (item.current_stock || 0), 0);
  const lowStockCount = (inventory || []).filter(item => item.current_stock < 500).length;
  const totalBags = Math.floor(totalStock / 50);

  const [typeData, setTypeData] = useState({ name: '', category: '', beginning_stock: 0 });
  const [incomingData, setIncomingData] = useState({ feed_type_id: '', bags: 0, date: new Date().toISOString().split('T')[0], notes: '' });
  const [consumptionData, setConsumptionData] = useState({ 
    flock_id: '', 
    date: new Date().toISOString().split('T')[0],
    entries: [{
      feed_type_male_id: '', 
      feed_type_female_id: '', 
      quantity_male_kg: 0, 
      quantity_female_kg: 0
    }]
  });

  useEffect(() => {
    if (user.assigned_flock_id && !consumptionData.flock_id) {
      setConsumptionData(prev => ({ ...prev, flock_id: user.assigned_flock_id }));
    }
  }, [user.assigned_flock_id, consumptionData.flock_id]);

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/feed-types', {
        method: 'POST',
        body: JSON.stringify(typeData),
      });
      
      setIsTypeModalOpen(false);
      setTypeData({ name: '', category: '', beginning_stock: 0 });
      refreshFeedTypes();
      refreshInventory();
    } catch (err) {
      console.error('Failed to add feed type:', err);
    }
  };

  const handleAddIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bags = Number(incomingData.bags) || 0;
      const qty_kg = Number(incomingData.quantity_kg) || (bags * 50);
      await apiFetch('/api/feed-incoming', {
        method: 'POST',
        body: JSON.stringify({
          ...incomingData,
          bags: qty_kg / 50,
          quantity_kg: qty_kg
        }),
      });
      
      setIsIncomingModalOpen(false);
      setIncomingData({ feed_type_id: '', bags: 0, date: new Date().toISOString().split('T')[0], notes: '' });
      refreshInventory();
      refreshIncomingHistory();
    } catch (err) {
      console.error('Failed to add incoming stock:', err);
    }
  };

  const handleAddConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Ensure feed type if quantity > 0
    for (const entry of consumptionData.entries) {
      if (entry.quantity_male_kg > 0 && !entry.feed_type_male_id) {
        alert('Please select a feed type for the male bird quantity.');
        return;
      }
      if (entry.quantity_female_kg > 0 && !entry.feed_type_female_id) {
        alert('Please select a feed type for the female bird quantity.');
        return;
      }
    }

    try {
      const records = consumptionData.entries.map(entry => ({
        flock_id: consumptionData.flock_id,
        date: consumptionData.date,
        feed_type_male_id: entry.feed_type_male_id || null,
        feed_type_female_id: entry.feed_type_female_id || null,
        quantity_male_kg: Number(entry.quantity_male_kg) || 0,
        quantity_female_kg: Number(entry.quantity_female_kg) || 0
      }));

      await apiFetch('/api/feed-consumption/batch', {
        method: 'POST',
        body: JSON.stringify({ records }),
      });
      
      setIsConsumptionModalOpen(false);
      setConsumptionData({ 
        flock_id: '', 
        date: new Date().toISOString().split('T')[0],
        entries: [{
          feed_type_male_id: '', 
          feed_type_female_id: '', 
          quantity_male_kg: 0, 
          quantity_female_kg: 0
        }]
      });
      refreshInventory();
      refreshConsumptionHistory();
    } catch (err) {
      console.error('Failed to log consumption:', err);
    }
  };

  const handleExportInventory = () => {
    if (!inventory) return;
    const exportData = inventory.map(item => ({
      'Feed Name': item.name,
      'Category': item.category,
      'Current Stock (kg)': item.current_stock,
      'Bags (approx)': Math.floor(item.current_stock / 50)
    }));
    exportToExcel(exportData, 'Feed_Inventory');
  };

  const handleExportIncoming = async () => {
    try {
      const data = await apiFetch('/api/feed-incoming');
      const exportData = data.map((item: any) => ({
        'Date': item.date,
        'Feed Type': item.name,
        'Quantity (kg)': item.quantity_kg,
        'Bags': item.quantity_kg / 50,
        'Notes': item.notes
      }));
      exportToExcel(exportData, 'Feed_Incoming_History');
    } catch (err) {
      console.error('Failed to export incoming history:', err);
    }
  };

  const handleExportConsumption = async () => {
    try {
      const data = await apiFetch('/api/feed-consumption');
      const exportData = data.map((item: any) => ({
        'Date': item.date,
        'House Number': item.house_number,
        'Male Feed Type': item.feed_male_name || 'N/A',
        'Male Qty (kg)': item.quantity_male_kg || 0,
        'Female Feed Type': item.feed_female_name || 'N/A',
        'Female Qty (kg)': item.quantity_female_kg || 0,
        'Total Qty (kg)': item.quantity_kg
      }));
      exportToExcel(exportData, 'Feed_Consumption_History');
    } catch (err) {
      console.error('Failed to export consumption history:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let skippedCounts = { flocks: 0, feeds: 0 };
        const formattedRecords = data.map(row => {
          let dateStr = new Date().toISOString().split('T')[0];
          if (row['Date']) {
            const d = new Date(row['Date']);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              dateStr = `${year}-${month}-${day}`;
            }
          }
          const houseNum = (row['House Number'] || row['House #'] || '').toString().trim();
          
          const flock = allFlocks?.find((f: any) => 
            f.house_number.toString().trim() === houseNum
          );

          if (!flock) {
            skippedCounts.flocks++;
            return null;
          }

          const maleFeedName = (row['Male Feed Type'] || '').toString().trim().toLowerCase();
          const femaleFeedName = (row['Female Feed Type'] || '').toString().trim().toLowerCase();
          
          const maleFeed = feedTypes?.find((t: any) => t.name.trim().toLowerCase() === maleFeedName);
          const femaleFeed = feedTypes?.find((t: any) => t.name.trim().toLowerCase() === femaleFeedName);

          if ((maleFeedName && !maleFeed) || (femaleFeedName && !femaleFeed)) {
            skippedCounts.feeds++;
          }

          return {
            flock_id: flock.id,
            date: dateStr,
            feed_type_male_id: maleFeed?.id || null,
            feed_type_female_id: femaleFeed?.id || null,
            quantity_male_kg: Math.round((Number(row['Male Qty (kg)'] || 0)) * 100) / 100,
            quantity_female_kg: Math.round((Number(row['Female Qty (kg)'] || 0)) * 100) / 100
          };
        }).filter(Boolean);

        if (formattedRecords.length > 0) {
          await apiFetch('/api/feed-consumption/batch', {
            method: 'POST',
            body: JSON.stringify({ records: formattedRecords }),
          });
          refreshInventory();
          refreshConsumptionHistory();
          
          let msg = `Successfully imported ${formattedRecords.length} records.`;
          if (skippedCounts.flocks > 0) msg += `\n- ${skippedCounts.flocks} records skipped (House not found).`;
          if (skippedCounts.feeds > 0) msg += `\n- ${skippedCounts.feeds} records had missing feed type mapping.`;
          alert(msg);
        } else {
          alert('No valid records found in the file. Please check the column headers.');
        }
      } catch (err) {
        console.error('Failed to import feed consumption records:', err);
        alert('Failed to import records. Please check the file format.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const handleBulkFixDates = async () => {
    const today = new Date().toISOString().split('T')[0];
    const recordsToFix = consumptionHistory.filter((r: any) => r.date === today);
    
    if (recordsToFix.length === 0) {
      alert('No records found with today\'s date to fix.');
      return;
    }

    const newDate = window.prompt('Enter the correct date (YYYY-MM-DD) for these ' + recordsToFix.length + ' records:', today);
    if (!newDate || newDate === today) return;

    try {
      let count = 0;
      for (const record of recordsToFix) {
        await apiFetch(`/api/feed-consumption/${record.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...record, date: newDate }),
        });
        count++;
      }
      alert(`Successfully updated ${count} records to ${newDate}.`);
      refreshConsumptionHistory();
    } catch (err) {
      console.error('Failed to bulk fix dates:', err);
      alert('Failed to update some records. Please check the history.');
    }
  };

  const handleClearAllConsumption = async () => {
    if (!window.confirm('Are you sure you want to delete ALL consumption history? This action cannot be undone.')) return;
    
    const revert = window.confirm('Would you like to revert the inventory stock as well? (Click OK to revert stock, Cancel to just clear logs)');
    
    try {
      await apiFetch(`/api/feed-consumption?revertInventory=${revert}`, { method: 'DELETE' });
      refreshInventory();
      refreshConsumptionHistory();
      alert('All consumption records have been deleted.');
    } catch (err) {
      console.error('Failed to clear all consumption history:', err);
      alert('Failed to clear history. Please try again.');
    }
  };

  const handleUpdateConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/feed-consumption/${editData.id}`, {
        method: 'PUT',
        body: JSON.stringify(editData),
      });
      
      setIsEditModalOpen(false);
      setEditData(null);
      refreshInventory();
      refreshConsumptionHistory();
    } catch (err) {
      console.error('Failed to update consumption record:', err);
    }
  };

  const handleUpdateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/api/feed-incoming/${editIncomingData.id}`, {
        method: 'PUT',
        body: JSON.stringify(editIncomingData),
      });
      
      setIsEditIncomingModalOpen(false);
      setEditIncomingData(null);
      refreshInventory();
      refreshIncomingHistory();
    } catch (err) {
      console.error('Failed to update incoming record:', err);
    }
  };

  const handleDeleteIncoming = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this incoming record? Inventory will be adjusted.')) return;
    try {
      await apiFetch(`/api/feed-incoming/${id}`, { method: 'DELETE' });
      refreshInventory();
      refreshIncomingHistory();
    } catch (err) {
      console.error('Failed to delete incoming record:', err);
    }
  };

  const handleRecalculateInventory = async () => {
    if (!window.confirm('This will recalculate all feed inventory based on incoming and consumption history. Continue?')) return;
    try {
      await apiFetch('/api/feed-inventory/recalculate', { method: 'POST' });
      refreshInventory();
      alert('Inventory recalculated successfully.');
    } catch (err) {
      console.error('Failed to recalculate inventory:', err);
      alert('Failed to recalculate inventory.');
    }
  };

  const handleDeleteConsumption = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this consumption record? This will also revert the feed inventory stock.')) return;
    try {
      await apiFetch(`/api/feed-consumption/${id}`, { method: 'DELETE' });
      refreshInventory();
      refreshConsumptionHistory();
    } catch (err) {
      console.error('Failed to delete consumption record:', err);
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Feed Management
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Manage your feed inventory, track incoming shipments, and monitor daily consumption across all flocks.
            <span className="block mt-2 text-[10px] text-stone-300 italic">Tip: Use the "Export" file as a template for "Batch Import".</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="file" 
            id="batch-upload-consumption" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
          />
          <label 
            htmlFor="batch-upload-consumption"
            className="btn-secondary flex items-center group cursor-pointer"
          >
            <Upload size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Batch Import
          </label>
          <button 
            onClick={handleExportInventory}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export
          </button>
          <button 
            onClick={handleRecalculateInventory}
            className="btn-secondary flex items-center group text-rose-600 border-rose-200 hover:bg-rose-50"
            title="Recalculate inventory from history"
          >
            <ArrowDownCircle size={18} className="mr-2 group-hover:rotate-180 transition-transform" /> Recalculate
          </button>
          <button 
            onClick={() => setIsTypeModalOpen(true)}
            className="btn-secondary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> New Feed Type
          </button>
          <button 
            onClick={() => setIsIncomingModalOpen(true)}
            className="btn-primary flex items-center group"
          >
            <ArrowDownCircle size={18} className="mr-2 group-hover:translate-y-1 transition-transform" /> Add Stock
          </button>
          <button 
            onClick={() => setIsConsumptionModalOpen(true)}
            className="btn-primary flex items-center group !bg-indigo-600 hover:!bg-indigo-700 !shadow-indigo-500/20"
          >
            <ArrowUpCircle size={18} className="mr-2 group-hover:-translate-y-1 transition-transform" /> Log Consumption
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-stone-900 text-white border-none shadow-xl shadow-stone-900/20 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Total Feed Stock</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-black tracking-tighter">{totalStock.toLocaleString()}</h3>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">kg</span>
          </div>
          <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Across all feed types</p>
        </div>
        
        <div className="card p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">Total Bags (Approx)</p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-black tracking-tighter text-stone-900">{totalBags.toLocaleString()}</h3>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Bags</span>
          </div>
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-1">Based on 50kg per bag</p>
        </div>

        <div className="card p-6 border-rose-100 bg-rose-50/30">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Low Stock Alerts</p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-3xl font-black tracking-tighter ${lowStockCount > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
              {lowStockCount}
            </h3>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Items</span>
          </div>
          <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-1">Stock below 500kg</p>
        </div>
      </div>

      <div className="bento-grid">
        {(inventory || []).map((item) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 bg-brand-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="p-3.5 bg-brand-50 rounded-2xl text-brand-600 shadow-inner">
                <Beef size={24} />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                  {item.category}
                </span>
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="font-black text-xl text-stone-900 tracking-tight mb-1">{item.name}</h3>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Feed Inventory</p>
              
              <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-black text-stone-900 tracking-tighter">{item.current_stock.toLocaleString()}</p>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">kg</p>
              </div>
              <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest mt-1">~{Math.floor(item.current_stock / 50)} Bags (50kg)</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex border-b border-slate-200 mt-8 mb-6">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'incoming'
              ? 'border-pastel-green-500 text-pastel-green-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Incoming History
        </button>
        <button
          onClick={() => setActiveTab('consumption')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'consumption'
              ? 'border-orange-500 text-orange-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Consumption History
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'reconciliation'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Inventory Reconciliation
        </button>
      </div>

      {activeTab === 'incoming' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={handleExportIncoming} className="text-sm font-bold text-pastel-green-700 hover:text-pastel-green-800 flex items-center">
              <Download size={16} className="mr-2" /> Export Incoming History
            </button>
          </div>
          {/* Incoming Feed History Table */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Incoming Feed History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Feed Type</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(incomingHistory || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{item.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {item.quantity_kg.toLocaleString()} kg
                        <span className="text-xs text-slate-400 ml-2">({item.quantity_kg / 50} bags)</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic">{item.notes || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => {
                              setEditIncomingData({
                                ...item,
                                bags: item.quantity_kg / 50
                              });
                              setIsEditIncomingModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteIncoming(item.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!incomingHistory || incomingHistory.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No incoming feed history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'consumption' ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={handleExportConsumption} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center">
              <Download size={16} className="mr-2" /> Export Consumption History
            </button>
          </div>
          {/* Consumption History Table */}
          <div className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900">Consumption History</h2>
                <button 
                  onClick={handleBulkFixDates}
                  className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 transition-colors uppercase tracking-wider"
                  title="Fix records that were imported with the wrong date"
                >
                  Bulk Fix Dates
                </button>
                <button 
                  onClick={handleClearAllConsumption}
                  className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-colors uppercase tracking-wider"
                  title="Delete all consumption history"
                >
                  Clear All
                </button>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Logs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">House</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Male Feed</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Female Feed</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Total Qty</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(consumptionHistory || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{item.date}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">House #{item.house_number}</td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-medium">{item.feed_male_name || 'N/A'}</div>
                        <div className="text-xs text-blue-600 font-bold">{item.quantity_male_kg || 0} kg</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 font-medium">{item.feed_female_name || 'N/A'}</div>
                        <div className="text-xs text-pink-600 font-bold">{item.quantity_female_kg || 0} kg</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-bold text-xs">
                          {item.quantity_kg.toLocaleString()} kg
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              setEditData({
                                ...item,
                                flock_id: (item.flock_id && typeof item.flock_id === 'object') ? (item.flock_id.id || item.flock_id._id) : item.flock_id,
                                feed_type_male_id: (item.feed_type_male_id && typeof item.feed_type_male_id === 'object') ? (item.feed_type_male_id.id || item.feed_type_male_id._id) : item.feed_type_male_id,
                                feed_type_female_id: (item.feed_type_female_id && typeof item.feed_type_female_id === 'object') ? (item.feed_type_female_id.id || item.feed_type_female_id._id) : item.feed_type_female_id,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="text-blue-500 hover:text-blue-700 font-bold text-xs uppercase tracking-wider"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteConsumption(item.id)}
                            className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-wider"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!consumptionHistory || consumptionHistory.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">No consumption history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card p-6 h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-900">Incoming vs Consumption (kg)</h3>
                <BarChart3 size={18} className="text-stone-400" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reconciliationData.map(item => ({
                  name: item.name,
                  Incoming: item.totalIncoming,
                  Consumption: item.totalConsumption
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Bar dataKey="Incoming" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="Consumption" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-6">
              <div className="card p-6 bg-blue-50 border-blue-100">
                <h3 className="text-sm font-bold text-blue-900 mb-2">What is Reconciliation?</h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  This view calculates what your stock <strong>should be</strong> based on all historical records (Beginning + Incoming - Consumption). 
                  If the "Variance" is not zero, it means the "Current Stock" has been manually adjusted or there is a calculation mismatch.
                </p>
                <button 
                  onClick={handleRecalculateInventory}
                  className="mt-4 w-full text-xs font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Sync Stock to Expected
                </button>
              </div>
              <div className="card p-6 bg-amber-50 border-amber-100">
                <h3 className="text-sm font-bold text-amber-900 mb-2">Audit Tip</h3>
                <p className="text-xs text-amber-700 leading-relaxed">
                  A positive variance means you have more physical stock than recorded consumption suggests. 
                  A negative variance means you've consumed more than you've received or started with. 
                </p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Inventory Reconciliation</h2>
              <p className="text-xs text-slate-500 mt-1">Comparing Beginning Stock + Incoming - Consumption vs Current Stock</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Feed Type</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Beginning</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right text-emerald-600">Incoming (+)</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right text-rose-600">Consumption (-)</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Expected Stock</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Current Stock</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-right">Variance</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliationData.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">{item.beginning_stock.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-medium">+{item.totalIncoming.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-medium">-{item.totalConsumption.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{item.expectedStock.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">{item.current_stock.toLocaleString()} kg</td>
                      <td className={`px-6 py-4 text-right font-bold ${item.variance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.variance > 0 ? '+' : ''}{item.variance.toLocaleString()} kg
                      </td>
                      <td className="px-6 py-4">
                        {item.variance === 0 ? (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase tracking-widest">Balanced</span>
                        ) : (
                          <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-black uppercase tracking-widest">Discrepancy</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Removed duplicate reconciliation info boxes */}
          </div>
        </div>
      )}

      {/* Modals */}
      {/* Edit Consumption Modal */}
      {isEditModalOpen && editData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Edit Consumption</h2>
            <form onSubmit={handleUpdateConsumption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  className="input-field" 
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">House / Flock</label>
                <select 
                  required 
                  className="input-field" 
                  value={editData.flock_id}
                  onChange={(e) => setEditData({ ...editData, flock_id: e.target.value })}
                >
                  <option value="">Select House</option>
                  {flocks.map(f => <option key={f.id} value={f.id}>House #{f.house_number}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Male Feed</label>
                  <select 
                    className="input-field" 
                    value={editData.feed_type_male_id || ''}
                    onChange={(e) => setEditData({ ...editData, feed_type_male_id: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qty (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input-field" 
                    value={isNaN(editData.quantity_male_kg) ? '' : editData.quantity_male_kg}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditData({ 
                        ...editData, 
                        quantity_male_kg: val,
                        quantity_kg: Math.round((val + (Number(editData.quantity_female_kg) || 0)) * 100) / 100
                      });
                    }} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Female Feed</label>
                  <select 
                    className="input-field" 
                    value={editData.feed_type_female_id || ''}
                    onChange={(e) => setEditData({ ...editData, feed_type_female_id: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qty (kg)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="input-field" 
                    value={isNaN(editData.quantity_female_kg) ? '' : editData.quantity_female_kg}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditData({ 
                        ...editData, 
                        quantity_female_kg: val,
                        quantity_kg: Math.round((val + (Number(editData.quantity_male_kg) || 0)) * 100) / 100
                      });
                    }} 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-6 py-3 bg-orange-600 rounded-xl font-bold text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">New Feed Type</h2>
            <form onSubmit={handleAddType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed Name</label>
                <input type="text" required className="input-field" onChange={(e) => setTypeData({ ...typeData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input type="text" required className="input-field" onChange={(e) => setTypeData({ ...typeData, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Beginning Stock (kg)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="0"
                  onChange={(e) => setTypeData({ ...typeData, beginning_stock: Number(e.target.value) })} 
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsTypeModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isIncomingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Add Stock</h2>
            <form onSubmit={handleAddIncoming} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed Type</label>
                <select required className="input-field" onChange={(e) => setIncomingData({ ...incomingData, feed_type_id: e.target.value })}>
                  <option value="">Select Feed</option>
                  {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (kg preferred)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="kg"
                    className="input-field" 
                    value={isNaN(incomingData.quantity_kg) ? '' : incomingData.quantity_kg} 
                    onChange={(e) => {
                      const kg = parseFloat(e.target.value) || 0;
                      setIncomingData({ ...incomingData, quantity_kg: kg, bags: kg / 50 });
                    }} 
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="bags"
                    className="input-field" 
                    value={isNaN(incomingData.bags) ? '' : incomingData.bags} 
                    onChange={(e) => {
                      const bags = parseFloat(e.target.value) || 0;
                      setIncomingData({ ...incomingData, bags: bags, quantity_kg: bags * 50 });
                    }} 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">1 bag = 50 kg. You can enter either kg or bags.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" required className="input-field" value={incomingData.date} onChange={(e) => setIncomingData({ ...incomingData, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  placeholder="e.g., Supplier info, batch number..."
                  value={incomingData.notes} 
                  onChange={(e) => setIncomingData({ ...incomingData, notes: e.target.value })}
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsIncomingModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Log Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditIncomingModalOpen && editIncomingData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-indigo-900">Edit Stock</h2>
            <form onSubmit={handleUpdateIncoming} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed Type</label>
                <select 
                  required 
                  className="input-field" 
                  value={editIncomingData.feed_type_id}
                  onChange={(e) => setEditIncomingData({ ...editIncomingData, feed_type_id: e.target.value })}
                >
                  <option value="">Select Feed</option>
                  {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (kg preferred)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="kg"
                    className="input-field" 
                    value={isNaN(editIncomingData.quantity_kg) ? '' : editIncomingData.quantity_kg} 
                    onChange={(e) => {
                      const kg = parseFloat(e.target.value) || 0;
                      setEditIncomingData({ ...editIncomingData, quantity_kg: kg, bags: kg / 50 });
                    }} 
                  />
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="bags"
                    className="input-field" 
                    value={isNaN(editIncomingData.bags) ? '' : editIncomingData.bags} 
                    onChange={(e) => {
                      const bags = parseFloat(e.target.value) || 0;
                      setEditIncomingData({ ...editIncomingData, bags: bags, quantity_kg: bags * 50 });
                    }} 
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">1 bag = 50 kg. You can enter either kg or bags.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required 
                  className="input-field" 
                  value={editIncomingData.date} 
                  onChange={(e) => setEditIncomingData({ ...editIncomingData, date: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  placeholder="e.g., Supplier info, batch number..."
                  value={editIncomingData.notes || ''} 
                  onChange={(e) => setEditIncomingData({ ...editIncomingData, notes: e.target.value })}
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsEditIncomingModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary !bg-indigo-600 hover:!bg-indigo-700">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConsumptionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Log Daily Consumption</h2>
              <button 
                type="button"
                onClick={() => setConsumptionData({
                  ...consumptionData,
                  entries: [...consumptionData.entries, {
                    feed_type_male_id: '',
                    feed_type_female_id: '',
                    quantity_male_kg: 0,
                    quantity_female_kg: 0
                  }]
                })}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Plus size={14} className="mr-1" /> Add Feed Type
              </button>
            </div>
            <form onSubmit={handleAddConsumption} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">House / Flock</label>
                  <select 
                    required 
                    className="input-field" 
                    value={consumptionData.flock_id}
                    onChange={(e) => setConsumptionData({ ...consumptionData, flock_id: e.target.value })}
                  >
                    <option value="">Select House</option>
                    {flocks.map(f => <option key={f.id} value={f.id}>House #{f.house_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required className="input-field" value={consumptionData.date} onChange={(e) => setConsumptionData({ ...consumptionData, date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-6">
                {consumptionData.entries.map((entry, index) => (
                  <div key={index} className="p-6 bg-slate-50 rounded-2xl relative group/entry border border-slate-100">
                    {consumptionData.entries.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newEntries = consumptionData.entries.filter((_, i) => i !== index);
                          setConsumptionData({ ...consumptionData, entries: newEntries });
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/entry:opacity-100 transition-opacity"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em]">Male Birds</h3>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Feed Type</label>
                          <select 
                            className="input-field" 
                            value={entry.feed_type_male_id}
                            onChange={(e) => {
                              const newEntries = [...consumptionData.entries];
                              newEntries[index].feed_type_male_id = e.target.value;
                              setConsumptionData({ ...consumptionData, entries: newEntries });
                            }}
                          >
                            <option value="">Select Feed</option>
                            {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Qty (kg)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            className="input-field" 
                            value={isNaN(entry.quantity_male_kg) ? '' : entry.quantity_male_kg} 
                            onChange={(e) => {
                              const newEntries = [...consumptionData.entries];
                              newEntries[index].quantity_male_kg = parseFloat(e.target.value);
                              setConsumptionData({ ...consumptionData, entries: newEntries });
                            }} 
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-pink-600 uppercase tracking-[0.2em]">Female Birds</h3>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Feed Type</label>
                          <select 
                            className="input-field" 
                            value={entry.feed_type_female_id}
                            onChange={(e) => {
                              const newEntries = [...consumptionData.entries];
                              newEntries[index].feed_type_female_id = e.target.value;
                              setConsumptionData({ ...consumptionData, entries: newEntries });
                            }}
                          >
                            <option value="">Select Feed</option>
                            {feedTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Qty (kg)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            className="input-field" 
                            value={isNaN(entry.quantity_female_kg) ? '' : entry.quantity_female_kg} 
                            onChange={(e) => {
                              const newEntries = [...consumptionData.entries];
                              newEntries[index].quantity_female_kg = parseFloat(e.target.value);
                              setConsumptionData({ ...consumptionData, entries: newEntries });
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsConsumptionModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary !bg-indigo-600 hover:!bg-indigo-700">Log Consumption</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
