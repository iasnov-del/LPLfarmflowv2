import React, { useState } from 'react';
import { Egg, Plus, Download, User, Share2, Copy, Check, Calendar, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';
import { exportToExcel } from '../utils/excelExport';

export default function EggProduction({ user }: { user: any }) {
  const { data: allRecords, loading: recordsLoading, refresh: refreshRecords } = useApi<any>('/api/eggs');
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

  const uniqueHouses = Array.from(
    new Set((flocks || []).map((f: any) => f.house_number).filter(Boolean))
  ).sort((a: any, b: any) => Number(a) - Number(b));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'records' | 'summary' | 'monthly'>('summary');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [copied, setCopied] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [formData, setFormData] = useState({
    flock_id: '',
    date: new Date().toISOString().split('T')[0],
    hatching_eggs: 0,
    he_floor_eggs: 0,
    small: 0,
    thin_shell: 0,
    misshape: 0,
    double_yolk: 0,
    broken: 0,
    spoiled: 0,
    others: 0,
    reported_by: user.fullName
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await apiFetch(`/api/eggs/${editingRecord.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/eggs', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      
      setIsModalOpen(false);
      setEditingRecord(null);
      setFormData({
        flock_id: '',
        date: new Date().toISOString().split('T')[0],
        hatching_eggs: 0,
        he_floor_eggs: 0,
        small: 0,
        thin_shell: 0,
        misshape: 0,
        double_yolk: 0,
        broken: 0,
        spoiled: 0,
        others: 0,
        reported_by: user.fullName
      });
      refreshRecords();
    } catch (err) {
      console.error('Failed to save egg production record:', err);
    }
  };

  const handleEdit = (record: any) => {
    const rFlockId = (record.flock_id && typeof record.flock_id === 'object') ? (record.flock_id.id || record.flock_id._id) : record.flock_id;
    setEditingRecord(record);
    setFormData({
      flock_id: rFlockId || '',
      date: record.date,
      hatching_eggs: record.hatching_eggs || 0,
      he_floor_eggs: record.he_floor_eggs || 0,
      small: record.small || 0,
      thin_shell: record.thin_shell || 0,
      misshape: record.misshape || 0,
      double_yolk: record.double_yolk || 0,
      broken: record.broken || 0,
      spoiled: record.spoiled || 0,
      others: record.others || 0,
      reported_by: record.reported_by || user.fullName
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await apiFetch(`/api/eggs/${id}`, { method: 'DELETE' });
      refreshRecords();
    } catch (err) {
      console.error('Failed to delete egg production record:', err);
    }
  };

  const handleExportSummary = () => {
    const exportData = sortedSummaries.map((s: any) => {
      const henDayVal = s.totalBirdDays > 0 ? (s.total / s.totalBirdDays * 100) : 0;
      const qRate = s.total > 0 ? (((s.hatching_eggs || 0) + (s.he_floor_eggs || 0)) / s.total * 100) : 0;
      return {
        'House Number': `House #${s.house}`,
        'Total Eggs': s.total,
        'Hatching Eggs (Nest)': s.hatching_eggs,
        'HE Floor Eggs': s.he_floor_eggs || 0,
        'Small': s.small,
        'Broken': s.broken,
        'Thin Shell': s.thin_shell,
        'Misshape': s.misshape,
        'Double Yolk': s.double_yolk,
        'Spoiled': s.spoiled,
        'Others': s.others,
        'Average Hen-Day %': `${henDayVal.toFixed(1)}%`,
        'Quality Rate %': `${qRate.toFixed(1)}%`,
        'Records Count': s.recordsCount
      };
    });
    exportToExcel(exportData, `Overall_Egg_Production_Summary`, 'House_Summaries');
  };

  const handleExportMonthly = (specificMonth?: string) => {
    const targetMonth = specificMonth || reportMonth;
    
    // Filter individual daily records belonging to the selected month/houses, or entire history if desired
    const targetRecords = records.filter((r: any) => {
      const rMonth = r.date.slice(0, 7); // YYYY-MM
      if (specificMonth && rMonth !== targetMonth) return false;
      const house = r.house_number || 'Unknown';
      if (selectedHouseFilter !== 'all' && String(house) !== String(selectedHouseFilter)) return false;
      return true;
    });

    const sortedData = [...targetRecords].sort((a: any, b: any) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return Number(a.house_number) - Number(b.house_number);
    });

    const exportData = sortedData.map((r: any) => {
      const total = (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + (r.small || 0) + (r.thin_shell || 0) + 
                    (r.misshape || 0) + (r.double_yolk || 0) + (r.broken || 0) + 
                    (r.spoiled || 0) + (r.others || 0);
      const actualCount = r.actual_female_count || r.beginning_female || 0;
      const henDayVal = actualCount > 0 ? (total / actualCount * 100) : 0;
      const qRate = total > 0 ? (((r.hatching_eggs || 0) + (r.he_floor_eggs || 0)) / total * 100) : 0;
      
      return {
        'Date': r.date,
        'House Number': `House #${r.house_number}`,
        'Total Eggs': total,
        'Hatching Eggs (Nest)': r.hatching_eggs || 0,
        'HE Floor Eggs': r.he_floor_eggs || 0,
        'Small': r.small || 0,
        'Broken': r.broken || 0,
        'Thin Shell': r.thin_shell || 0,
        'Misshape': r.misshape || 0,
        'Double Yolk': r.double_yolk || 0,
        'Spoiled': r.spoiled || 0,
        'Others': r.others || 0,
        'Hen-Day %': `${henDayVal.toFixed(1)}%`,
        'Quality Rate %': `${qRate.toFixed(1)}%`,
        'Reported By': r.reported_by || 'N/A'
      };
    });

    const suffix = selectedHouseFilter !== 'all' ? `_House_${selectedHouseFilter}` : '_Per_House';
    const fileName = specificMonth 
      ? `Monthly_Egg_Production_${targetMonth}${suffix}`
      : `All_Monthly_Egg_Production${suffix}`;

    const sheetName = specificMonth ? targetMonth.replace('-', '_') : 'Monthly_Data';
    
    exportToExcel(exportData, fileName, sheetName);
  };

  const handleExport = () => {
    if (activeView === 'summary') {
      handleExportSummary();
    } else if (activeView === 'monthly') {
      handleExportMonthly(reportMonth);
    } else {
      const exportData = records.map(r => {
        const total = (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + r.small + r.thin_shell + r.misshape + r.double_yolk + r.broken + r.spoiled + r.others;
        return {
          'Date': r.date,
          'House Number': `House #${r.house_number}`,
          'Hatching Eggs (Nest)': r.hatching_eggs,
          'HE Floor Eggs': r.he_floor_eggs || 0,
          'Small': r.small,
          'Thin Shell': r.thin_shell,
          'Misshape': r.misshape,
          'Double Yolk': r.double_yolk,
          'Broken': r.broken,
          'Spoiled': r.spoiled,
          'Others': r.others,
          'Total Eggs': total,
          'Reported By': r.reported_by
        };
      });
      exportToExcel(exportData, 'Egg_Production_Records');
    }
  };

  const houseSummaries = records.reduce((acc: any, r: any) => {
    const house = r.house_number || 'Unknown';
    if (!acc[house]) {
      acc[house] = {
        house,
        hatching_eggs: 0,
        he_floor_eggs: 0,
        small: 0,
        thin_shell: 0,
        misshape: 0,
        double_yolk: 0,
        broken: 0,
        spoiled: 0,
        others: 0,
        total: 0,
        beginning_female: r.beginning_female || 0,
        totalBirdDays: 0,
        recordsCount: 0
      };
    }
    acc[house].hatching_eggs += (r.hatching_eggs || 0);
    acc[house].he_floor_eggs += (r.he_floor_eggs || 0);
    acc[house].small += (r.small || 0);
    acc[house].thin_shell += (r.thin_shell || 0);
    acc[house].misshape += (r.misshape || 0);
    acc[house].double_yolk += (r.double_yolk || 0);
    acc[house].broken += (r.broken || 0);
    acc[house].spoiled += (r.spoiled || 0);
    acc[house].others += (r.others || 0);
    acc[house].total += (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + (r.small || 0) + (r.thin_shell || 0) + 
                        (r.misshape || 0) + (r.double_yolk || 0) + (r.broken || 0) + 
                        (r.spoiled || 0) + (r.others || 0);
    acc[house].totalBirdDays += (r.actual_female_count || r.beginning_female || 0);
    acc[house].recordsCount += 1;
    return acc;
  }, {});

  const sortedSummaries = Object.values(houseSummaries).sort((a: any, b: any) => Number(a.house) - Number(b.house));

  const monthlyDailyRecords = records
    .filter((r: any) => {
      const rMonth = r.date.slice(0, 7); // YYYY-MM
      if (rMonth !== reportMonth) return false;
      const house = r.house_number || 'Unknown';
      if (selectedHouseFilter !== 'all' && String(house) !== String(selectedHouseFilter)) return false;
      return true;
    })
    .sort((a: any, b: any) => b.date.localeCompare(a.date) || Number(a.house_number) - Number(b.house_number));

  const monthlyStats = monthlyDailyRecords.reduce((acc: any, r: any) => {
    const total = (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + (r.small || 0) + (r.thin_shell || 0) + 
                  (r.misshape || 0) + (r.double_yolk || 0) + (r.broken || 0) + 
                  (r.spoiled || 0) + (r.others || 0);
    acc.hatching_eggs += (r.hatching_eggs || 0);
    acc.he_floor_eggs += (r.he_floor_eggs || 0);
    acc.small += (r.small || 0);
    acc.broken += (r.broken || 0);
    acc.thin_shell += (r.thin_shell || 0);
    acc.misshape += (r.misshape || 0);
    acc.double_yolk += (r.double_yolk || 0);
    acc.spoiled += (r.spoiled || 0);
    acc.others += (r.others || 0);
    acc.total += total;
    acc.totalBirdDays += (r.actual_female_count || r.beginning_female || 0);
    return acc;
  }, {
    hatching_eggs: 0,
    he_floor_eggs: 0,
    small: 0,
    broken: 0,
    thin_shell: 0,
    misshape: 0,
    double_yolk: 0,
    spoiled: 0,
    others: 0,
    total: 0,
    totalBirdDays: 0
  });

  const generateMessengerReport = () => {
    const dailyRecords = records.filter(r => r.date === reportDate);
    if (dailyRecords.length === 0) return "No records found for this date.";

    // Sort by house number
    const sortedRecords = [...dailyRecords].sort((a, b) => (a.house_number || 0) - (b.house_number || 0));

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    let report = `L.P. LIM CITY FAMILY FARM INC\n`;
    report += `DAILY EGG REPORT\n\n`;
    report += `DATE:\t${formatDate(reportDate)}\n\n`;

    let totalTEP = 0;
    let totalHE = 0;
    let totalHE_Nest = 0;
    let totalHE_Floor = 0;
    let totalNHE = 0;
    let totalSpoil = 0;
    let totalDY = 0;

    sortedRecords.forEach(r => {
      const nhe = (r.small || 0) + (r.broken || 0) + (r.thin_shell || 0) + (r.double_yolk || 0) + (r.misshape || 0) + (r.others || 0) + (r.spoiled || 0);
      const tep = (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + nhe;
      const henDay = r.actual_female_count > 0 ? (tep / r.actual_female_count) * 100 : 0;

      report += `HOUSE ${r.house_number}\n\n`;
      report += `TEP;\t${tep}\n`;
      report += `HE NEST;\t${r.hatching_eggs || 0}\n`;
      report += `HE FLOOR;\t${r.he_floor_eggs || 0}\n\n`;
      report += `SMALL;\t${r.small || 0}\n`;
      report += `BROKEN;\t${r.broken || 0}\n`;
      report += `TS;\t${r.thin_shell || 0}\n`;
      report += `DY;\t${r.double_yolk || 0}\n`;
      report += `MS;\t${r.misshape || 0}\n`;
      report += `OTH:\t${r.others || 0}\n`;
      report += `SPOILED;\t${r.spoiled || 0}\n`;
      report += `TOTAL NHE;\t${nhe}\n\n\n`;

      totalTEP += tep;
      totalHE += (r.hatching_eggs || 0) + (r.he_floor_eggs || 0);
      totalHE_Nest += (r.hatching_eggs || 0);
      totalHE_Floor += (r.he_floor_eggs || 0);
      totalNHE += nhe;
      totalSpoil += (r.spoiled || 0);
      totalDY += (r.double_yolk || 0);
    });

    const grandTEP = totalTEP - totalSpoil - totalDY;
    const totalActualFemale = sortedRecords.reduce((sum, r) => sum + (r.actual_female_count || r.beginning_female || 0), 0);
    const grandHenDay = totalActualFemale > 0 ? (totalTEP / totalActualFemale) * 100 : 0;

    report += `TOTAL TEP;\t${totalTEP}\n`;
    report += `TOTAL HE NEST;\t${totalHE_Nest}\n`;
    report += `TOTAL HE FLOOR;\t${totalHE_Floor}\n`;
    report += `TOTAL HE;\t${totalHE}\n`;
    report += `TOTAL NHE;\t${totalNHE}\n`;
    report += `TOTAL SPOIL;\t${totalSpoil}\n`;
    report += `TOTAL DY;\t${totalDY}\n\n`;
    report += `GRAND TEP;\t${grandTEP}`;

    return report;
  };

  const handleCopyReport = () => {
    const report = generateMessengerReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Egg Production
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Record daily egg collection, categorize by quality, and track production efficiency across all houses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="btn-secondary flex items-center group !bg-blue-50 !text-blue-700 !border-blue-100 hover:!bg-blue-100"
          >
            <Share2 size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Messenger Report
          </button>
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export Excel
          </button>
          <button 
            onClick={() => {
              setEditingRecord(null);
              setFormData({
                flock_id: '',
                date: new Date().toISOString().split('T')[0],
                hatching_eggs: 0,
                he_floor_eggs: 0,
                small: 0,
                thin_shell: 0,
                misshape: 0,
                double_yolk: 0,
                broken: 0,
                spoiled: 0,
                others: 0,
                reported_by: user.fullName
              });
              setIsModalOpen(true);
            }}
            className="btn-primary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> Log Production
          </button>
        </div>
      </header>

      {/* Daily Performance Quick Stats */}
      {records.some((r: any) => r.date === new Date().toISOString().split('T')[0]) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = records.filter((r: any) => r.date === today);
            const totalEggs = todayRecords.reduce((sum: number, r: any) => sum + (r.hatching_eggs || 0) + (r.he_floor_eggs || 0) + (r.small || 0) + (r.thin_shell || 0) + (r.misshape || 0) + (r.double_yolk || 0) + (r.broken || 0) + (r.spoiled || 0) + (r.others || 0), 0);
            const totalHatching = todayRecords.reduce((sum: number, r: any) => sum + (r.hatching_eggs || 0) + (r.he_floor_eggs || 0), 0);
            const totalPop = todayRecords.reduce((sum: number, r: any) => sum + (r.actual_female_count || r.beginning_female || 0), 0);
            const avgHenDay = totalPop > 0 ? (totalEggs / totalPop) * 100 : 0;
            const hatchingRate = totalEggs > 0 ? (totalHatching / totalEggs) * 100 : 0;

            return (
              <>
                <div className="card p-4 flex items-center space-x-4 border-l-4 border-l-indigo-500">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Today's Hen-Day</p>
                    <p className="text-xl font-black text-stone-900">{avgHenDay.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="card p-4 flex items-center space-x-4 border-l-4 border-l-pastel-green-500">
                  <div className="w-10 h-10 rounded-xl bg-pastel-green-50 flex items-center justify-center text-pastel-green-600">
                    <Egg size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Today's Production</p>
                    <p className="text-xl font-black text-stone-900">{totalEggs.toLocaleString()}</p>
                  </div>
                </div>
                <div className="card p-4 flex items-center space-x-4 border-l-4 border-l-amber-500">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Hatching Rate</p>
                    <p className="text-xl font-black text-stone-900">{hatchingRate.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="card p-4 flex items-center space-x-4 border-l-4 border-l-stone-400">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Houses Logged</p>
                    <p className="text-xl font-black text-stone-900">{todayRecords.length} / {allFlocks?.length || 0}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>
      )}

      <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-2xl w-fit mb-8">
        <button 
          onClick={() => setActiveView('summary')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeView === 'summary' 
              ? 'bg-white text-stone-900 shadow-sm' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Overall Summary
        </button>
        <button 
          onClick={() => setActiveView('monthly')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeView === 'monthly' 
              ? 'bg-white text-stone-900 shadow-sm' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Monthly Report
        </button>
        <button 
          onClick={() => setActiveView('records')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeView === 'records' 
              ? 'bg-white text-stone-900 shadow-sm' 
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Daily Records
        </button>
      </div>

      {activeView === 'records' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-pastel-green-50 text-pastel-green-800 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">House</th>
                  <th className="px-2 py-4 text-center">HE Nest</th>
                  <th className="px-2 py-4 text-center">HE Floor</th>
                  <th className="px-2 py-4 text-center">Small</th>
                  <th className="px-2 py-4 text-center">Broken</th>
                  <th className="px-2 py-4 text-center">Thin/Miss.</th>
                  <th className="px-2 py-4 text-center">D.Yolk</th>
                  <th className="px-4 py-4 text-center bg-pastel-green-100/50">Total</th>
                  <th className="px-2 py-4 text-center text-indigo-600">Hen-Day %</th>
                  <th className="px-4 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pastel-green-50">
                {records.sort((a,b) => b.date.localeCompare(a.date)).map((record: any) => {
                  const thinMiss = (record.thin_shell || 0) + (record.misshape || 0);
                  const total = (record.hatching_eggs || 0) + (record.he_floor_eggs || 0) + (record.small || 0) + (record.thin_shell || 0) + 
                                (record.misshape || 0) + (record.double_yolk || 0) + (record.broken || 0) + 
                                (record.spoiled || 0) + (record.others || 0);
                  const henDay = record.actual_female_count > 0 ? (total / record.actual_female_count) * 100 : 0;
                  return (
                    <tr key={record.id} className="hover:bg-pastel-green-50/50 transition-colors text-xs">
                      <td className="px-4 py-4 font-medium whitespace-nowrap">{record.date}</td>
                      <td className="px-4 py-4 whitespace-nowrap font-bold text-stone-600">H#{record.house_number}</td>
                      <td className="px-2 py-4 text-center text-pastel-green-700 font-black">{(record.hatching_eggs || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center text-pastel-green-600 font-bold">{(record.he_floor_eggs || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center text-stone-600 font-medium">{(record.small || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center text-rose-600 font-medium">{(record.broken || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center text-stone-500">{(thinMiss || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center text-stone-500">{(record.double_yolk || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-center font-black text-stone-900 bg-pastel-green-50/30">{(total || 0).toLocaleString()}</td>
                      <td className="px-2 py-4 text-center font-black text-indigo-600">{henDay.toFixed(1)}%</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleEdit(record)}
                            className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeView === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSummaries.map((summary: any) => (
            <motion.div 
              key={summary.house}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 border-stone-100 hover:shadow-xl hover:shadow-stone-200/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-stone-900">House #{summary.house}</h3>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1">Total Production Summary</p>
                </div>
                <div className="w-12 h-12 bg-pastel-green-50 rounded-2xl flex items-center justify-center text-pastel-green-600 group-hover:scale-110 transition-transform">
                  <Egg size={24} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 p-3 bg-pastel-green-50/50 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-stone-600">HE Nest</span>
                    <span className="text-sm font-black text-pastel-green-700">{summary.hatching_eggs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-pastel-green-100/50 pt-1">
                    <span className="text-sm font-bold text-stone-600">HE Floor</span>
                    <span className="text-sm font-black text-pastel-green-700">{(summary.he_floor_eggs || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-pastel-green-200/50 pt-1 text-xs">
                    <span className="font-extrabold text-stone-500 uppercase tracking-widest text-[9px]">Total Hatching</span>
                    <span className="font-black text-pastel-green-800">{((summary.hatching_eggs || 0) + (summary.he_floor_eggs || 0)).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Small</p>
                    <p className="text-sm font-bold text-stone-700">{summary.small.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Broken</p>
                    <p className="text-sm font-bold text-rose-600">{summary.broken.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Thin/Miss.</p>
                    <p className="text-sm font-bold text-stone-700">{(summary.thin_shell + summary.misshape).toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Spoiled</p>
                    <p className="text-sm font-bold text-stone-700">{summary.spoiled.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Average Hen-Day</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {summary.totalBirdDays > 0 
                        ? (summary.total / summary.totalBirdDays * 100).toFixed(1) 
                        : 0}%
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-xl font-black text-stone-900">{summary.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-stone-100 gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Reporting Period</p>
                  <input 
                    type="month" 
                    className="text-lg font-bold text-stone-900 border-none p-0 focus:ring-0 cursor-pointer bg-transparent focus:outline-none"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                  />
                </div>
              </div>

              <div className="hidden sm:block h-8 w-[1px] bg-stone-100" />

              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-pastel-green-50 rounded-xl flex items-center justify-center text-pastel-green-600">
                  <Egg size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">House Filter</p>
                  <select
                    value={selectedHouseFilter}
                    onChange={(e) => setSelectedHouseFilter(e.target.value)}
                    className="text-lg font-bold text-stone-900 border-none p-0 focus:ring-0 cursor-pointer bg-transparent focus:outline-none"
                  >
                    <option value="all">All Houses</option>
                    {uniqueHouses.map((house: any) => (
                      <option key={house} value={house}>House #{house}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleExportMonthly(reportMonth)}
                className="btn-secondary flex items-center group text-xs py-2.5 px-4 shadow-sm"
                title="Export selected month's summary to Excel"
              >
                <Download size={15} className="mr-2 group-hover:scale-110 transition-transform text-pastel-green-600" /> Export This Month
              </button>
              <button
                onClick={() => handleExportMonthly()}
                className="btn-secondary flex items-center group text-xs py-2.5 px-4 shadow-sm !bg-stone-50 hover:!bg-stone-100"
                title="Export all historical months' summary to Excel"
              >
                <Download size={15} className="mr-2 group-hover:scale-110 transition-transform text-stone-500" /> Export All Months History
              </button>
            </div>

            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Selected Month</p>
              <p className="text-lg font-bold text-stone-900">
                {new Date(reportMonth + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Monthly Stats Overview Cards */}
          {monthlyDailyRecords.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Month Production</p>
                <p className="text-2xl font-black text-stone-900">{monthlyStats.total.toLocaleString()} eggs</p>
              </div>
              <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Hatching Eggs</p>
                <p className="text-2xl font-black text-pastel-green-600">
                  {((monthlyStats.hatching_eggs || 0) + (monthlyStats.he_floor_eggs || 0)).toLocaleString()}
                </p>
                <p className="text-[9px] text-stone-400 font-bold mt-1">
                  Nest: {(monthlyStats.hatching_eggs || 0).toLocaleString()} | Floor: {(monthlyStats.he_floor_eggs || 0).toLocaleString()}
                </p>
              </div>
              <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Quality Rate</p>
                <p className="text-2xl font-black text-indigo-600">
                  {monthlyStats.total > 0 ? ((((monthlyStats.hatching_eggs || 0) + (monthlyStats.he_floor_eggs || 0)) / monthlyStats.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="card p-5 bg-gradient-to-br from-white to-stone-50 border border-stone-100 flex flex-col justify-between">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Avg Month Hen-Day %</p>
                <p className="text-2xl font-black text-amber-600">
                  {monthlyStats.totalBirdDays > 0 ? ((monthlyStats.total / monthlyStats.totalBirdDays) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">House</th>
                    <th className="px-2 py-4 text-center">HE Nest</th>
                    <th className="px-2 py-4 text-center">HE Floor</th>
                    <th className="px-2 py-4 text-center">Small</th>
                    <th className="px-2 py-4 text-center">Broken</th>
                    <th className="px-2 py-4 text-center">Thin/Miss.</th>
                    <th className="px-2 py-4 text-center">D.Yolk</th>
                    <th className="px-2 py-4 text-center">Spoiled</th>
                    <th className="px-4 py-4 text-center bg-stone-100/50">Total</th>
                    <th className="px-2 py-4 text-center text-indigo-600">Hen-Day %</th>
                    <th className="px-4 py-4 text-center">Reporter</th>
                    <th className="px-4 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {monthlyDailyRecords.map((record: any) => {
                    const thinMiss = (record.thin_shell || 0) + (record.misshape || 0);
                    const total = (record.hatching_eggs || 0) + (record.he_floor_eggs || 0) + (record.small || 0) + (record.thin_shell || 0) + 
                                  (record.misshape || 0) + (record.double_yolk || 0) + (record.broken || 0) + 
                                  (record.spoiled || 0) + (record.others || 0);
                    const henDay = record.actual_female_count > 0 ? (total / record.actual_female_count) * 100 : 0;
                    return (
                      <tr key={record.id} className="hover:bg-stone-50/55 transition-colors text-xs">
                        <td className="px-4 py-4 font-medium whitespace-nowrap">{record.date}</td>
                        <td className="px-4 py-4 whitespace-nowrap font-bold text-stone-600">H#{record.house_number}</td>
                        <td className="px-2 py-4 text-center text-pastel-green-700 font-black">{(record.hatching_eggs || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-pastel-green-600 font-bold">{(record.he_floor_eggs || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-stone-600 font-medium">{(record.small || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-rose-600 font-bold">{(record.broken || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-stone-500">{(thinMiss || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-stone-500">{(record.double_yolk || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center text-stone-500">{(record.spoiled || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 text-center font-black text-stone-900 bg-stone-50/30">{(total || 0).toLocaleString()}</td>
                        <td className="px-2 py-4 text-center font-black text-indigo-600">{henDay.toFixed(1)}%</td>
                        <td className="px-4 py-4 text-center text-stone-500 whitespace-nowrap">{record.reported_by || 'N/A'}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit Record"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {monthlyDailyRecords.length === 0 && (
              <div className="border-t border-stone-100 rounded-b-3xl p-16 text-center">
                <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-300">
                  <Calendar size={32} />
                </div>
                <h3 className="text-lg font-bold text-stone-900 mb-1">No monthly records found</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">There are no individual daily production entries logged for the selected period.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingRecord ? 'Edit Egg Production' : 'Log Egg Production'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">House / Flock</label>
                  <select required className="input-field" value={formData.flock_id} onChange={(e) => setFormData({ ...formData, flock_id: e.target.value })}>
                    <option value="">Select House</option>
                    {flocks.map(f => <option key={f.id} value={f.id}>House #{f.house_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" required className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-pastel-green-700 border-b border-pastel-green-100 pb-2">Hatching Eggs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold">HE Nest Eggs</label>
                    <input type="number" required placeholder="Nest Eggs" className="input-field" value={isNaN(formData.hatching_eggs) ? '' : formData.hatching_eggs} onChange={(e) => setFormData({ ...formData, hatching_eggs: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold">HE Floor Eggs</label>
                    <input type="number" required placeholder="Floor Eggs" className="input-field" value={isNaN(formData.he_floor_eggs) ? '' : formData.he_floor_eggs} onChange={(e) => setFormData({ ...formData, he_floor_eggs: parseInt(e.target.value) })} />
                  </div>
                </div>
                
                <h3 className="font-bold text-pastel-green-700 border-b border-pastel-green-100 pb-2">Non-Hatching Eggs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Small</label>
                    <input type="number" className="input-field" value={isNaN(formData.small) ? '' : formData.small} onChange={(e) => setFormData({ ...formData, small: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Thin Shell</label>
                    <input type="number" className="input-field" value={isNaN(formData.thin_shell) ? '' : formData.thin_shell} onChange={(e) => setFormData({ ...formData, thin_shell: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Misshape</label>
                    <input type="number" className="input-field" value={isNaN(formData.misshape) ? '' : formData.misshape} onChange={(e) => setFormData({ ...formData, misshape: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Double Yolk</label>
                    <input type="number" className="input-field" value={isNaN(formData.double_yolk) ? '' : formData.double_yolk} onChange={(e) => setFormData({ ...formData, double_yolk: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Broken</label>
                    <input type="number" className="input-field" value={isNaN(formData.broken) ? '' : formData.broken} onChange={(e) => setFormData({ ...formData, broken: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Spoiled</label>
                    <input type="number" className="input-field" value={isNaN(formData.spoiled) ? '' : formData.spoiled} onChange={(e) => setFormData({ ...formData, spoiled: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Others</label>
                    <input type="number" className="input-field" value={isNaN(formData.others) ? '' : formData.others} onChange={(e) => setFormData({ ...formData, others: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setEditingRecord(null);
                  setFormData({
                    flock_id: '',
                    date: new Date().toISOString().split('T')[0],
                    hatching_eggs: 0,
                    he_floor_eggs: 0,
                    small: 0,
                    thin_shell: 0,
                    misshape: 0,
                    double_yolk: 0,
                    broken: 0,
                    spoiled: 0,
                    others: 0,
                    reported_by: user.fullName
                  });
                }} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">{editingRecord ? 'Update Record' : 'Save Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Messenger Report</h2>
              <button onClick={() => setIsReportModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
              />
            </div>

            <div className="bg-stone-50 rounded-2xl p-6 font-mono text-xs whitespace-pre-wrap border border-stone-100 max-h-[400px] overflow-y-auto mb-6">
              {generateMessengerReport()}
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={handleCopyReport}
                className={`flex-1 flex items-center justify-center py-3 rounded-xl font-bold transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} className="mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} className="mr-2" /> Copy to Clipboard
                  </>
                )}
              </button>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
