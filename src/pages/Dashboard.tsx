import React, { useState, useEffect } from 'react';
import { Bird, Beef, Skull, Egg, TrendingUp, Calendar, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useApi } from '../hooks/useApi';

export default function Dashboard({ user }: { user: any }) {
  const { data: flocks } = useApi<any>('/api/flocks');
  const { data: eggs } = useApi<any>('/api/eggs');
  const { data: mortality } = useApi<any>('/api/mortality');
  const { data: transfers } = useApi<any>('/api/flock-transfers');
  const { data: farm } = useApi<any>('/api/farm');
  const { data: inventory } = useApi<any[]>('/api/feed-inventory');

  const [stats, setStats] = useState({
    totalFlocks: 0,
    activeBirds: 0,
    activeMales: 0,
    activeFemales: 0,
    totalEggsToday: 0,
    mortalityRate: "0.00",
    depletionRate: "0.00",
    maleDepletionRate: "0.00",
    femaleDepletionRate: "0.00",
    totalDepletionCount: 0,
    maleDepletionCount: 0,
    femaleDepletionCount: 0,
    totalFeedStock: 0
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!flocks || !eggs || !mortality || !transfers) return;

    try {
      setError(null);
      
      // Filter data based on assigned flock if applicable
      const filteredFlocks = user.assigned_flock_id 
        ? (flocks || []).filter((f: any) => f.id === user.assigned_flock_id)
        : flocks;
        
      const activeFlocks = (filteredFlocks || []).filter((f: any) => f && f.status === 'active');
      const activeFlockIds = new Set(activeFlocks.map((f: any) => f.id));
      
      const beginningMales = activeFlocks.reduce((acc: number, f: any) => acc + (f.beginning_male || 0), 0);
      const beginningFemales = activeFlocks.reduce((acc: number, f: any) => acc + (f.beginning_female || 0), 0);
      const beginningBirds = beginningMales + beginningFemales;
      
      const getFlockId = (f: any) => {
        if (!f) return null;
        return typeof f === 'object' ? (f.id || f._id) : f;
      };

      const maleMortalityOnly = (mortality || []).reduce((acc: number, m: any) => {
        if (!m) return acc;
        const mFlockId = getFlockId(m.flock_id);
        if (activeFlockIds.has(mFlockId)) {
          return acc + (m.male_mortality || 0);
        }
        return acc;
      }, 0);

      const femaleMortalityOnly = (mortality || []).reduce((acc: number, m: any) => {
        if (!m) return acc;
        const mFlockId = getFlockId(m.flock_id);
        if (activeFlockIds.has(mFlockId)) {
          return acc + (m.female_mortality || 0);
        }
        return acc;
      }, 0);

      const maleCulls = (mortality || []).reduce((acc: number, m: any) => {
        if (!m) return acc;
        const mFlockId = getFlockId(m.flock_id);
        if (activeFlockIds.has(mFlockId)) {
          return acc + (m.male_spot_cull || 0) + (m.male_spent_cull || 0) + (m.male_missex || 0);
        }
        return acc;
      }, 0);

      const femaleCulls = (mortality || []).reduce((acc: number, m: any) => {
        if (!m) return acc;
        const mFlockId = getFlockId(m.flock_id);
        if (activeFlockIds.has(mFlockId)) {
          return acc + (m.female_spot_cull || 0) + (m.female_spent_cull || 0) + (m.female_missex || 0);
        }
        return acc;
      }, 0);

      const maleDepletion = maleMortalityOnly + maleCulls;
      const femaleDepletion = femaleMortalityOnly + femaleCulls;
      const totalDepletion = maleDepletion + femaleDepletion;
      const totalMortality = maleMortalityOnly + femaleMortalityOnly;

      const maleOutgoing = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tFromId = getFlockId(t.from_flock_id);
        if (activeFlockIds.has(tFromId)) {
          return acc + (t.male_count || 0);
        }
        return acc;
      }, 0);

      const femaleOutgoing = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tFromId = getFlockId(t.from_flock_id);
        if (activeFlockIds.has(tFromId)) {
          return acc + (t.female_count || 0);
        }
        return acc;
      }, 0);

      const maleIncoming = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tToId = getFlockId(t.to_flock_id);
        if (activeFlockIds.has(tToId)) {
          return acc + (t.male_count || 0);
        }
        return acc;
      }, 0);

      const femaleIncoming = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tToId = getFlockId(t.to_flock_id);
        if (activeFlockIds.has(tToId)) {
          return acc + (t.female_count || 0);
        }
        return acc;
      }, 0);

      const totalIncoming = maleIncoming + femaleIncoming;
      const totalOutgoing = maleOutgoing + femaleOutgoing;

      // For farm-level stats, internal transfers should not increase the "total started" pool.
      // Net started = beginning + (incoming - outgoing). 
      // This assumes outgoing from an active flock either goes to another active flock (0 net change)
      // or leaves the active pool (handled as depletion/outgoing).
      // However, a simpler way is to only count incoming that didn't come from another active flock.
      
      const maleIncomingFromOutside = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tToId = getFlockId(t.to_flock_id);
        const tFromId = getFlockId(t.from_flock_id);
        if (activeFlockIds.has(tToId) && !activeFlockIds.has(tFromId)) {
          return acc + (t.male_count || 0);
        }
        return acc;
      }, 0);

      const femaleIncomingFromOutside = (transfers || []).reduce((acc: number, t: any) => {
        if (!t) return acc;
        const tToId = getFlockId(t.to_flock_id);
        const tFromId = getFlockId(t.from_flock_id);
        if (activeFlockIds.has(tToId) && !activeFlockIds.has(tFromId)) {
          return acc + (t.female_count || 0);
        }
        return acc;
      }, 0);

      const totalStartedMales = beginningMales + maleIncomingFromOutside;
      const totalStartedFemales = beginningFemales + femaleIncomingFromOutside;
      const totalStartedBirds = totalStartedMales + totalStartedFemales;

      const currentMales = beginningMales - maleDepletion - maleOutgoing + maleIncoming;
      const currentFemales = beginningFemales - femaleDepletion - femaleOutgoing + femaleIncoming;
      const currentBirds = currentMales + currentFemales;
      
      const today = new Date().toISOString().split('T')[0];
      const eggsToday = (eggs || [])
        .filter((e: any) => e && e.date === today)
        .reduce((acc: number, e: any) => acc + (e.hatching_eggs || 0) + (e.small || 0) + (e.thin_shell || 0) + (e.misshape || 0) + (e.double_yolk || 0) + (e.broken || 0) + (e.spoiled || 0) + (e.others || 0), 0);

      const totalFeedStock = (inventory || []).reduce((acc: number, item: any) => acc + (item.current_stock || 0), 0);

      setStats({
        totalFlocks: activeFlocks.length,
        activeBirds: isNaN(currentBirds) ? 0 : currentBirds,
        activeMales: isNaN(currentMales) ? 0 : currentMales,
        activeFemales: isNaN(currentFemales) ? 0 : currentFemales,
        totalEggsToday: eggsToday,
        mortalityRate: totalStartedBirds > 0 ? ((totalMortality / totalStartedBirds) * 100).toFixed(2) : "0.00",
        depletionRate: totalStartedBirds > 0 ? ((totalDepletion / totalStartedBirds) * 100).toFixed(2) : "0.00",
        maleDepletionRate: totalStartedMales > 0 ? ((maleDepletion / totalStartedMales) * 100).toFixed(2) : "0.00",
        femaleDepletionRate: totalStartedFemales > 0 ? ((femaleDepletion / totalStartedFemales) * 100).toFixed(2) : "0.00",
        totalDepletionCount: totalDepletion,
        maleDepletionCount: maleDepletion,
        femaleDepletionCount: femaleDepletion,
        totalFeedStock: totalFeedStock
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch dashboard data');
    }
  }, [flocks, eggs, mortality, transfers, inventory]);

  const cards = [
    { label: 'Active Flocks', value: stats.totalFlocks, icon: Bird, color: 'bg-indigo-500', trend: '+2 this week' },
    { label: 'Total Birds', value: stats.activeBirds.toLocaleString(), icon: TrendingUp, color: 'bg-stone-800', trend: 'Overall' },
    { label: 'Male Birds', value: stats.activeMales.toLocaleString(), icon: TrendingUp, color: 'bg-blue-500', trend: 'Male Pop' },
    { label: 'Female Birds', value: stats.activeFemales.toLocaleString(), icon: TrendingUp, color: 'bg-pink-500', trend: 'Female Pop' },
    { label: 'Eggs Today', value: stats.totalEggsToday, icon: Egg, color: 'bg-amber-500', trend: '+12% vs avg' },
    { label: 'Feed Stock', value: `${stats.totalFeedStock.toLocaleString()} kg`, icon: Beef, color: 'bg-emerald-500', trend: 'Current' },
    { label: 'Total Depletion', value: `${stats.depletionRate}%`, icon: Skull, color: 'bg-rose-500', trend: `${stats.totalDepletionCount.toLocaleString()} birds` },
    { label: 'Male Depletion', value: `${stats.maleDepletionRate}%`, icon: Skull, color: 'bg-blue-600', trend: `${stats.maleDepletionCount.toLocaleString()} birds` },
    { label: 'Female Depletion', value: `${stats.femaleDepletionRate}%`, icon: Skull, color: 'bg-pink-600', trend: `${stats.femaleDepletionCount.toLocaleString()} birds` },
  ];

  return (
    <div className="space-y-10 relative min-h-screen">
      {/* Subtle Background Pattern & Logo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Dot Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{ 
            backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />
        
        {/* Logo Watermark */}
        {farm?.logo_url && (
          <div 
            className="absolute inset-0 opacity-[0.08] flex items-center justify-center pointer-events-none"
            style={{ 
              backgroundImage: `url("${farm.logo_url}")`,
              backgroundSize: '40%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'grayscale(100%)'
            }}
          />
        )}
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 mb-12">
        <div className="flex-1">
          <div className="flex items-center space-x-4 md:space-x-6 mb-4">
            {farm?.logo_url && (
              <div className="relative">
                <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full" />
                <img 
                  src={farm.logo_url} 
                  alt="Farm Logo" 
                  className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] object-cover shadow-2xl border-2 border-white relative z-10"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-1">
                {farm?.name || 'Dashboard'}
              </h1>
              <div className="flex items-center text-xs md:text-sm text-stone-400 font-medium space-x-2">
                <span>Welcome back, <span className="text-stone-900 font-bold">{user.fullName}</span></span>
                <span className="w-1 h-1 bg-stone-300 rounded-full" />
                <span className="truncate max-w-[200px] md:max-w-md">{farm?.address || 'No address set'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-stone-100 shadow-sm self-start md:self-auto">
          <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600 shadow-inner">
            <Calendar size={20} />
          </div>
          <div className="pr-6">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1">Current Date</p>
            <p className="text-sm font-bold text-stone-900 leading-none">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-6 py-4 rounded-[2rem] flex items-center space-x-3 relative z-10" role="alert">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Skull size={20} />
          </div>
          <div>
            <strong className="font-bold block">System Alert</strong>
            <span className="text-sm opacity-80">{error}</span>
          </div>
        </div>
      )}

      <div className="bento-grid relative z-10">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="card group overflow-hidden relative"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-gradient-to-br ${card.color.replace('bg-', 'from-')}/10 to-transparent rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className={`p-4 md:p-5 rounded-2xl md:rounded-3xl text-white shadow-2xl ${card.color} shadow-${card.color.split('-')[1]}-500/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <card.icon size={24} className="md:w-7 md:h-7" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 bg-stone-50 px-3 py-1.5 rounded-full border border-stone-100 shadow-sm mb-2">
                  {card.trend}
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3].map(dot => (
                    <div key={dot} className={`w-1 h-1 rounded-full ${dot === 1 ? card.color : 'bg-stone-200'}`} />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-[10px] md:text-xs font-black text-stone-400 uppercase tracking-[0.2em] mb-2">{card.label}</p>
              <div className="flex items-baseline space-x-2">
                <p className="text-2xl md:text-4xl font-black text-stone-900 tracking-tighter">{card.value}</p>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-stone-900 flex items-center">
              <TrendingUp className="mr-3 text-brand-600" /> Performance Overview
            </h2>
            <select className="text-xs font-bold text-stone-400 bg-stone-50 border-none rounded-xl px-4 py-2 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-stone-100 rounded-[2rem] bg-stone-50/30">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-300 mb-4">
              <TrendingUp size={32} />
            </div>
            <p className="text-stone-400 font-medium tracking-tight">Analytics data will appear here as records are added.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="card bg-white border border-stone-100 shadow-sm overflow-hidden">
            <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center px-6 pt-6">
              <Home className="mr-3 text-brand-600" /> Farm Profile
            </h2>
            <div className="px-6 pb-8 space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {farm?.logo_url ? (
                    <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Home className="text-stone-300" size={32} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 leading-tight mb-1">{farm?.name || 'Loading...'}</h3>
                  <p className="text-xs text-stone-400 font-medium leading-relaxed">{farm?.address || 'No address set'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-50">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center text-emerald-600 font-bold text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                    Operational
                  </div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Region</p>
                  <p className="text-stone-900 font-bold text-xs truncate">
                    {farm?.address?.split(',').pop()?.trim() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-stone-900 mb-6 flex items-center">
              <Beef className="mr-3 text-brand-600" /> Feed Inventory
            </h2>
            <div className="space-y-6">
              {inventory && inventory.length > 0 ? (
                inventory.map((item: any) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-stone-700">{item.name}</span>
                      <span className="text-sm font-black text-stone-900">{item.current_stock.toLocaleString()} kg</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                      <span>{item.category}</span>
                      <span>~{Math.floor(item.current_stock / 50)} Bags</span>
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          item.current_stock < 500 ? 'bg-rose-500' : 
                          item.current_stock < 1500 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (item.current_stock / 5000) * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-400 italic">No feed inventory data available.</p>
              )}
              <p className="text-[10px] text-stone-400 italic pt-2 border-t border-stone-50">
                Stock levels are updated automatically based on incoming shipments and daily consumption logs.
              </p>
            </div>
          </div>

          <div className="card bg-stone-900 text-white border-none shadow-xl shadow-stone-900/20">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <Bird className="mr-3 text-brand-400" /> Quick Tips
            </h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Maintain optimal house temperature between 24-27°C for maximum egg production efficiency.
            </p>
            <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
              View Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

