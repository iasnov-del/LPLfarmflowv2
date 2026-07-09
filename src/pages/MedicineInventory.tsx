import React, { useState, useEffect } from 'react';
import { Pill, Plus, Upload, ArrowUpCircle, Download, ArrowDownCircle, Calendar, Calculator, AlertTriangle, CheckCircle2, Droplet, BookOpen, Layers, Edit, Trash2, Settings2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToExcel } from '../utils/excelExport';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

const standardPlans = [
  {
    id: "nd-ib-1",
    name: "ND + IB Vaccine (Newcastle + Infectious Bronchitis)",
    category: "Vaccine",
    ageDays: 1,
    ageDisplay: "Day 1",
    dosage: "1 dose / bird",
    dosageValue: 1,
    dosageUnit: "dose",
    method: "Intraocular / Eye Drop",
    diseases: "Newcastle Disease, Infectious Bronchitis",
    description: "Primary immunization for flock protection on emergence.",
    details: "Essential first-day defense. Usually administered via spray or direct eye drops."
  },
  {
    id: "mareks-1",
    name: "Marek's Disease Vaccine",
    category: "Vaccine",
    ageDays: 1,
    ageDisplay: "Day 1",
    dosage: "0.2 mL / bird",
    dosageValue: 0.2,
    dosageUnit: "mL",
    method: "Subcutaneous Injection",
    diseases: "Marek's Disease",
    description: "Subcutaneous injection administered at hatchery.",
    details: "Protects against Marek's paralysis. Must be kept deeply frozen until reconstituted."
  },
  {
    id: "gumboro-1",
    name: "Infectious Bursal Disease (Gumboro) Vaccine",
    category: "Vaccine",
    ageDays: 12,
    ageDisplay: "Day 12",
    dosage: "1 dose / bird",
    dosageValue: 1,
    dosageUnit: "dose",
    method: "Drinking Water",
    diseases: "Gumboro (IBD)",
    description: "Initial Gumboro drinking water vaccine.",
    details: "Requires withholding water for 1-2 hours prior to ensure active drinking of the treated water."
  },
  {
    id: "coccidiosis-1",
    name: "Amprolium / Coccidiostat Course",
    category: "Medicine",
    ageDays: 18,
    ageDisplay: "Day 18",
    dosage: "1.2 g / Liter of water",
    dosageValue: 1.2,
    dosageUnit: "g/L",
    method: "Drinking Water",
    diseases: "Coccidiosis prevention",
    description: "Preventative medicine course as chicks begin bedding contact.",
    details: "Coccidiosis spreads via wet litter. Apply 5-day continuous drinking water treat."
  },
  {
    id: "nd-ib-booster",
    name: "ND + IB Booster",
    category: "Vaccine",
    ageDays: 21,
    ageDisplay: "Day 21",
    dosage: "1 dose / bird",
    dosageValue: 1,
    dosageUnit: "dose",
    method: "Drinking Water",
    diseases: "Newcastle Disease, Infectious Bronchitis",
    description: "Secondary booster to prolong active antibody titers.",
    details: "Boosts respiratory immunity as maternal antibody counts decline."
  },
  {
    id: "vitamin-boost-1",
    name: "Multivitamin AD3E + B-Complex Boost",
    category: "Supplement",
    ageDays: 28,
    ageDisplay: "Day 28",
    dosage: "0.5 mL / Liter of water",
    dosageValue: 0.5,
    dosageUnit: "mL/L",
    method: "Drinking Water",
    diseases: "Growth Stress, Immune Support",
    description: "General vitamin replenishment with stress course.",
    details: "Helps skeleton growth and nutrient absorption during high development rate."
  },
  {
    id: "fowl-pox-1",
    name: "Fowl Pox Vaccine",
    category: "Vaccine",
    ageDays: 42,
    ageDisplay: "Week 6 (Day 42)",
    dosage: "1 dose / bird",
    dosageValue: 1,
    dosageUnit: "dose",
    method: "Wing-Web Puncture",
    diseases: "Avian Fowl Pox",
    description: "Wing-web skin puncture vaccine.",
    details: "Provides lifelong immunity against fowl pox. Requires check for 'takes' (lesions) after 7 days."
  },
  {
    id: "deworming-1",
    name: "Levamisole Dewormer",
    category: "Medicine",
    ageDays: 56,
    ageDisplay: "Week 8 (Day 56)",
    dosage: "0.4 g / Liter of water",
    dosageValue: 0.4,
    dosageUnit: "g/L",
    method: "Drinking Water",
    diseases: "Internal Parasites / Worms",
    description: "Broad-spectrum roundworm treatment.",
    details: "Purges active intestinal worm populations. Highly recommended prior to laying onset."
  },
  {
    id: "calcium-fortify",
    name: "Calcium & Electrolyte Forte",
    category: "Supplement",
    ageDays: 112,
    ageDisplay: "Week 16 (Day 112)",
    dosage: "2 g / Liter of water",
    dosageValue: 2,
    dosageUnit: "g/L",
    method: "Drinking Water",
    diseases: "Egg Shell Thickness pre-lay support",
    description: "Heavy calcium booster course to prep pullets for laying.",
    details: "Strengthens medullary bone reserves prior to production phase."
  }
];

export default function MedicineInventory({ user }: { user: any }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: inventory, refresh: refreshInventory } = useApi<any[]>('/api/medicine-inventory');
  const { data: allFlocks } = useApi<any[]>('/api/flocks');
  const { data: allHistory, refresh: refreshHistory } = useApi<any[]>('/api/medicine-administration');
  const { data: medicineTypes, refresh: refreshTypes } = useApi<any[]>('/api/medicine-types');
  const { data: incomingHistory, refresh: refreshIncomingHistory } = useApi<any[]>('/api/medicine-incoming');
  const { data: mortality } = useApi<any[]>('/api/mortality');
  const { data: transfers } = useApi<any[]>('/api/flock-transfers');
  const { data: treatmentPlans, refresh: refreshTreatmentPlans } = useApi<any[]>('/api/treatment-plans');

  const plans = (treatmentPlans && treatmentPlans.length > 0) ? treatmentPlans : standardPlans;

  const flocks = user.assigned_flock_id 
    ? (allFlocks || []).filter((f: any) => f.id === user.assigned_flock_id)
    : (allFlocks || []);
    
  const history = user.assigned_flock_id
    ? (allHistory || []).filter((r: any) => {
        const rFlockId = (r.flock_id && typeof r.flock_id === 'object') ? (r.flock_id.id || r.flock_id._id) : r.flock_id;
        return rFlockId === user.assigned_flock_id;
      })
    : (allHistory || []);
  
  const filteredInventory = (inventory || []).filter((item: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(searchLower);
    const manufacturerMatch = item.manufacturer?.toLowerCase().includes(searchLower);
    const typeMatch = (typeof item.type === 'string' ? item.type : (item.type_id?.name || '')).toLowerCase().includes(searchLower);
    return nameMatch || manufacturerMatch || typeMatch;
  });
  
  // Page Navigation State
  const [activePageTab, setActivePageTab] = useState<'inventory' | 'schedule'>('inventory');

  // Calculator State
  const [calcFlockId, setCalcFlockId] = useState('');
  const [calcPlanId, setCalcPlanId] = useState('');
  const [isCustomTreatment, setIsCustomTreatment] = useState(false);
  const [customMedId, setCustomMedId] = useState('');
  const [calcDosageValue, setCalcDosageValue] = useState<number>(1);
  const [calcDosageUnit, setCalcDosageUnit] = useState<string>('dose');
  const [calcDays, setCalcDays] = useState<number>(1);
  const [calcMethod, setCalcMethod] = useState('');
  const [linkedInventoryId, setLinkedInventoryId] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccessMessage, setCalcSuccessMessage] = useState<string | null>(null);

  // Program Plans Admin Tool States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState<any | null>(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    category: 'Vaccine',
    ageDays: 1,
    dosageValue: 1,
    dosageUnit: 'dose',
    method: '',
    diseases: '',
    description: '',
    details: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  
  const [isEditingProduct, setIsEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type_id: '',
    manufacturer: '',
    expiration_date: '',
    image_url: '',
    stock_quantity: 0,
    unit_type: 'Vial',
    capacity_per_unit: 1000,
    calc_by_vials: true,
    vials_count: 0
  });

  const [incomingData, setIncomingData] = useState({
    medicine_id: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    calc_by_vials: true,
    vials_count: 0
  });

  const [adminData, setAdminData] = useState({
    medicine_id: '',
    flock_id: '',
    date: new Date().toISOString().split('T')[0],
    method: '',
    peripherals: '',
    peripheral_quantity: 0,
    quantity: 0,
    calc_by_vials: false,
    vials_count: 0
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalStockQty = formData.calc_by_vials 
        ? (Number(formData.vials_count) * Number(formData.capacity_per_unit)) 
        : Number(formData.stock_quantity);

      const payload = {
        name: formData.name,
        type_id: formData.type_id,
        manufacturer: formData.manufacturer,
        expiration_date: formData.expiration_date,
        image_url: formData.image_url,
        stock_quantity: finalStockQty,
        unit_type: formData.unit_type,
        capacity_per_unit: Number(formData.capacity_per_unit) || 1000
      };

      if (isEditingProduct) {
        await apiFetch(`/api/medicine-inventory/${isEditingProduct.id || isEditingProduct._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/api/medicine-inventory', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setIsEditingProduct(null);
      setFormData({
        name: '',
        type_id: '',
        manufacturer: '',
        expiration_date: '',
        image_url: '',
        stock_quantity: 0,
        unit_type: 'Vial',
        capacity_per_unit: 1000,
        calc_by_vials: true,
        vials_count: 0
      });
      refreshInventory();
    } catch (error) {
      console.error("Error adding medicine:", error);
    }
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/medicine-types', {
        method: 'POST',
        body: JSON.stringify({ name: newTypeName }),
      });
      setIsTypeModalOpen(false);
      setNewTypeName('');
      refreshTypes();
    } catch (error) {
      console.error("Error adding medicine type:", error);
    }
  };

  const handleIncomingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedMed = inventory?.find(i => i.id === incomingData.medicine_id || i._id === incomingData.medicine_id);
      const capacity = selectedMed?.capacity_per_unit || 1;

      const incomingQty = incomingData.calc_by_vials
        ? (Number(incomingData.vials_count) * Number(capacity))
        : Number(incomingData.quantity);

      await apiFetch('/api/medicine-incoming', {
        method: 'POST',
        body: JSON.stringify({
          medicine_id: incomingData.medicine_id,
          quantity: incomingQty,
          date: incomingData.date,
          notes: incomingData.notes
        }),
      });
      setIsIncomingModalOpen(false);
      setIncomingData({
        medicine_id: '',
        quantity: 0,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        calc_by_vials: true,
        vials_count: 0
      });
      refreshInventory();
      refreshIncomingHistory();
    } catch (error) {
      console.error("Error adding incoming stock:", error);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedMed = inventory?.find(i => i.id === adminData.medicine_id || i._id === adminData.medicine_id);
      const capacity = selectedMed?.capacity_per_unit || 1;

      const adminQty = adminData.calc_by_vials
        ? (Number(adminData.vials_count) * Number(capacity))
        : Number(adminData.quantity);

      await apiFetch('/api/medicine-administration', {
        method: 'POST',
        body: JSON.stringify({
          medicine_id: adminData.medicine_id,
          flock_id: adminData.flock_id,
          date: adminData.date,
          method: adminData.method,
          peripherals: adminData.peripherals,
          peripheral_quantity: adminData.peripheral_quantity,
          quantity: adminQty
        }),
      });

      setIsAdminModalOpen(false);
      setAdminData({
        medicine_id: '',
        flock_id: '',
        date: new Date().toISOString().split('T')[0],
        method: '',
        peripherals: '',
        peripheral_quantity: 0,
        quantity: 0,
        calc_by_vials: false,
        vials_count: 0
      });
      refreshHistory();
      refreshInventory();
    } catch (error) {
      console.error("Error logging administration:", error);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEditing = !!isEditingPlan;
      const url = isEditing ? `/api/treatment-plans/${isEditingPlan.id || isEditingPlan._id}` : '/api/treatment-plans';
      const method = isEditing ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        body: JSON.stringify(planFormData)
      });

      refreshTreatmentPlans();
      setIsPlanModalOpen(false);
      setIsEditingPlan(null);
      // Reset form data
      setPlanFormData({
        name: '',
        category: 'Vaccine',
        ageDays: 1,
        dosageValue: 1,
        dosageUnit: 'dose',
        method: '',
        diseases: '',
        description: '',
        details: ''
      });
    } catch (err: any) {
      console.error('Error saving standard plan: ', err);
      alert('Error saving program guide: ' + err.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this standard program guide?')) return;
    try {
      await apiFetch(`/api/treatment-plans/${id}`, {
        method: 'DELETE'
      });
      refreshTreatmentPlans();
      if (calcPlanId === id) {
        setCalcPlanId('');
      }
    } catch (err: any) {
      console.error('Error deleting plan:', err);
      alert('Error deleting standard plan: ' + err.message);
    }
  };

  // Helper for age & population calculations
  const getFlockIdLocal = (f: any) => {
    if (!f) return null;
    return typeof f === 'object' ? (f.id || f._id) : f;
  };

  const calculateFlockStats = (flock: any) => {
    if (!flock) return { totalNum: 0, maleNum: 0, femaleNum: 0, ageDaysNum: 0, ageWeeksNum: 0 };
    
    const loadingDate = new Date(flock.loading_date);
    const today = new Date();
    const ageDaysNum = Math.floor((today.getTime() - loadingDate.getTime()) / (1000 * 60 * 60 * 24));
    const ageWeeksNum = Math.floor(ageDaysNum / 7);

    const flockMortality = (mortality || []).filter(m => {
      const mFlockId = getFlockIdLocal(m.flock_id);
      return mFlockId === flock.id;
    });
    
    const maleMortality = flockMortality.reduce((acc, m) => acc + (m.male_mortality || 0), 0);
    const femaleMortality = flockMortality.reduce((acc, m) => acc + (m.female_mortality || 0), 0);

    const maleSpotCull = flockMortality.reduce((acc, m) => acc + (m.male_spot_cull || 0), 0);
    const femaleSpotCull = flockMortality.reduce((acc, m) => acc + (m.female_spot_cull || 0), 0);

    const maleMissex = flockMortality.reduce((acc, m) => acc + (m.male_missex || 0), 0);
    const femaleMissex = flockMortality.reduce((acc, m) => acc + (m.female_missex || 0), 0);

    const maleSpentCull = flockMortality.reduce((acc, m) => acc + (m.male_spent_cull || 0), 0);
    const femaleSpentCull = flockMortality.reduce((acc, m) => acc + (m.female_spent_cull || 0), 0);

    const maleDead = maleMortality + maleSpotCull + maleSpentCull + maleMissex;
    const femaleDead = femaleMortality + femaleSpotCull + femaleSpentCull + femaleMissex;
    
    const flockOutgoing = (transfers || []).filter(t => {
      const tFromId = getFlockIdLocal(t.from_flock_id);
      return tFromId === flock.id;
    });
    const flockIncoming = (transfers || []).filter(t => {
      const tToId = getFlockIdLocal(t.to_flock_id);
      return tToId === flock.id;
    });

    const maleOutgoing = flockOutgoing.reduce((acc, t) => acc + (t.male_count || 0), 0);
    const femaleOutgoing = flockOutgoing.reduce((acc, t) => acc + (t.female_count || 0), 0);
    
    const maleIncoming = flockIncoming.reduce((acc, t) => acc + (t.male_count || 0), 0);
    const femaleIncoming = flockIncoming.reduce((acc, t) => acc + (t.female_count || 0), 0);

    const maleBeginning = flock.beginning_male || 0;
    const femaleBeginning = flock.beginning_female || 0;
    
    const maleEnding = Math.max(0, maleBeginning - maleDead - maleOutgoing + maleIncoming);
    const femaleEnding = Math.max(0, femaleBeginning - femaleDead - femaleOutgoing + femaleIncoming);
    
    return {
      totalNum: maleEnding + femaleEnding,
      maleNum: maleEnding,
      femaleNum: femaleEnding,
      ageDaysNum,
      ageWeeksNum
    };
  };

  // Pre-populate first flock ID
  useEffect(() => {
    if (flocks && flocks.length > 0 && !calcFlockId) {
      setCalcFlockId(flocks[0].id || flocks[0]._id);
    }
  }, [flocks, calcFlockId]);

  // Pre-populate first plan ID when plans list loaded
  useEffect(() => {
    if (plans && plans.length > 0 && !calcPlanId) {
      setCalcPlanId(plans[0].id || plans[0]._id);
    }
  }, [plans, calcPlanId]);

  // Synchronize dynamic calculator values on plan selection
  useEffect(() => {
    if (!isCustomTreatment) {
      const plan = plans.find(p => p.id === calcPlanId || p._id === calcPlanId);
      if (plan) {
        setCalcDosageValue(plan.dosageValue);
        setCalcDosageUnit(plan.dosageUnit);
        setCalcMethod(plan.method);
        
        // Auto-detect course duration
        const planIdStr = String(plan.id || plan._id || '').toLowerCase();
        const planNameStr = String(plan.name || '').toLowerCase();
        if (planIdStr.includes('course') || planIdStr.includes('deworming') || planIdStr.includes('vitamin') || planIdStr.includes('calcium') || planIdStr.includes('coccidiosis') ||
            planNameStr.includes('course') || planNameStr.includes('dewormer') || planNameStr.includes('vitamin') || planNameStr.includes('calcium') || planNameStr.includes('coccidiosis')) {
          if (planIdStr.includes('coccidiosis') || planNameStr.includes('coccidiosis')) setCalcDays(5);
          else if (planIdStr.includes('deworm') || planNameStr.includes('deworm')) setCalcDays(2);
          else setCalcDays(3);
        } else {
          setCalcDays(1);
        }

        // Auto-match corresponding inventory item dynamically
        if (inventory && inventory.length > 0) {
          const planWords = plan.name.toLowerCase().split(' ');
          const firstThreeWords = planWords.slice(0, 3);
          const matched = inventory.find(item => {
            const itemLow = item.name.toLowerCase();
            return firstThreeWords.some(word => word.length > 2 && itemLow.includes(word)) ||
                   itemLow.includes(plan.category.toLowerCase());
          });
          if (matched) {
            setLinkedInventoryId(matched.id || matched._id);
          } else {
            setLinkedInventoryId('');
          }
        }
      }
    } else {
      // Custom treatment resets or links to current selected custom product
      setLinkedInventoryId(customMedId);
    }
  }, [calcPlanId, isCustomTreatment, inventory, customMedId, plans]);

  const handleLogCalculatedAdmin = async () => {
    if (!calcFlockId) {
      alert('Please select a house / flock first.');
      return;
    }
    
    const selectedFlock = flocks.find(f => f.id === calcFlockId);
    if (!selectedFlock) return;
    
    const stats = calculateFlockStats(selectedFlock);
    
    // Compute quantity to store in DB
    let dosageVal = Number(calcDosageValue) || 1;
    let daysVal = Number(calcDays) || 1;
    let totalNeeded = stats.totalNum * dosageVal * daysVal;
    
    if (calcDosageUnit.includes('/L')) {
      const estDailyWaterLiters = Math.ceil(stats.totalNum * 0.2);
      totalNeeded = estDailyWaterLiters * dosageVal * daysVal;
    }
    
    const medIdToUse = isCustomTreatment ? customMedId : linkedInventoryId;
    if (!medIdToUse) {
      alert('Please select or map a real product from your inventory to log administration.');
      return;
    }

    const currentMed = inventory?.find(x => (x.id === medIdToUse || x._id === medIdToUse));
    if (!currentMed) {
      alert('Selected product not found in active inventory.');
      return;
    }

    if (currentMed.stock_quantity < totalNeeded) {
      const logAnyway = window.confirm(`Stock Shortage! You only have ${currentMed.stock_quantity.toLocaleString()} units, but this treatment requires ${Math.round(totalNeeded).toLocaleString()} units. Do you want to log it anyway?`);
      if (!logAnyway) return;
    }

    setIsCalculating(true);
    setCalcSuccessMessage(null);
    try {
      await apiFetch('/api/medicine-administration', {
        method: 'POST',
        body: JSON.stringify({
          medicine_id: medIdToUse,
          flock_id: calcFlockId,
          date: new Date().toISOString().split('T')[0],
          method: calcMethod || 'Drinking Water',
          peripherals: isCustomTreatment ? 'Custom Calculation' : `Standard Plan Auto-Calc`,
          peripheral_quantity: 0,
          quantity: Math.round(totalNeeded)
        }),
      });

      setCalcSuccessMessage(`Success! Computed & recorded administration of ${Math.round(totalNeeded).toLocaleString()} units of ${currentMed.name} to House #${selectedFlock.house_number}!`);
      
      // Clear success message after 5 seconds
      setTimeout(() => setCalcSuccessMessage(null), 5000);
      
      // Refresh inventory and historical administration logs
      refreshInventory();
      refreshHistory();
    } catch (err: any) {
      console.error("Failed to log calculated admin:", err);
      alert(err.message || "Failed to log administration.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExportInventory = () => {
    if (!inventory) return;
    const exportData = inventory.map(item => ({
      'Name': item.name,
      'Type': item.type,
      'Manufacturer': item.manufacturer,
      'Expiration Date': item.expiration_date,
      'Current Stock': item.stock_quantity
    }));
    exportToExcel(exportData, 'Medicine_Inventory');
  };

  const handleExportIncoming = () => {
    if (!incomingHistory) return;
    const exportData = incomingHistory.map(record => ({
      'Date': record.date,
      'Medicine Name': record.medicine_name,
      'Quantity': record.quantity,
      'Notes': record.notes
    }));
    exportToExcel(exportData, 'Medicine_Incoming_History');
  };

  const handleExportHistory = () => {
    if (!history || !inventory || !flocks) return;
    const exportData = history.map(record => {
      const medicine = inventory.find(i => i.id === record.medicine_id);
      const flock = flocks.find(f => f.id === record.flock_id);
      return {
        'Date': record.date,
        'Name': medicine?.name || 'Unknown',
        'House': flock ? `House #${flock.house_number}` : 'Unknown',
        'Quantity Administered': record.quantity,
        'Method': record.method,
        'Peripherals Used': record.peripherals,
        'Peripheral Quantity': record.peripheral_quantity
      };
    });
    exportToExcel(exportData, 'Medicine_Administration_History');
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Medicine & Vaccine
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Manage your medical inventory, track vaccinations, and monitor administration history across all flocks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportInventory}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export
          </button>
          <button 
            onClick={() => setIsTypeModalOpen(true)}
            className="btn-secondary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> New Type
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-secondary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> New Product
          </button>
          <button 
            onClick={() => setIsIncomingModalOpen(true)}
            className="btn-primary flex items-center group"
          >
            <ArrowDownCircle size={18} className="mr-2 group-hover:translate-y-1 transition-transform" /> Incoming Stock
          </button>
          <button 
            onClick={() => setIsAdminModalOpen(true)}
            className="btn-primary flex items-center group !bg-indigo-600 hover:!bg-indigo-700 !shadow-indigo-500/20"
          >
            <ArrowUpCircle size={18} className="mr-2 group-hover:-translate-y-1 transition-transform" /> Log Administration
          </button>
        </div>
      </header>

      {/* Dynamic Tab Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 animate-fade-in relative z-10">
        <div className="flex bg-stone-100 p-1.5 rounded-2xl w-fit gap-1.5 border border-stone-200/50 shadow-sm">
          <button
            onClick={() => {
              setActivePageTab('inventory');
              setCalcSuccessMessage(null);
            }}
            className={`flex items-center space-x-2.5 px-6 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${
              activePageTab === 'inventory'
                ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers size={16} />
            <span>Active Inventory</span>
          </button>
          <button
            onClick={() => {
              setActivePageTab('schedule');
              setCalcSuccessMessage(null);
            }}
            className={`flex items-center space-x-2.5 px-6 py-2.5 rounded-xl font-bold transition-all duration-200 text-sm ${
              activePageTab === 'schedule'
                ? 'bg-white text-brand-600 shadow-sm ring-1 ring-stone-200'
                : 'text-stone-500 hover:text-brand-600'
            }`}
          >
            <Calendar size={16} />
            <span>Treatment Plans & Calculator</span>
          </button>
        </div>

        {activePageTab === 'inventory' && (
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-stone-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by name, manufacturer, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[10px] uppercase font-black text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {activePageTab === 'inventory' ? (
        filteredInventory.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/60 shadow-sm max-w-sm mx-auto my-8">
            <div className="w-14 h-14 bg-stone-50 border border-stone-100/80 rounded-2xl flex items-center justify-center mx-auto mb-4 text-stone-400">
              <Search size={24} />
            </div>
            <h3 className="text-base font-black text-stone-900 tracking-tight mb-1">No medicines found</h3>
            <p className="text-xs text-stone-400 font-bold mb-5 leading-normal">
              There are no products in active inventory matching "{searchTerm}".
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="bento-grid">
            {filteredInventory.map((item) => (
            <motion.div 
              key={item.id || item._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card group overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 bg-brand-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="h-48 bg-stone-50 rounded-2xl mb-6 overflow-hidden flex items-center justify-center relative z-10 border border-stone-100 group-hover:bg-white transition-colors">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center text-stone-300">
                    <Pill size={48} className="mb-2 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <h3 className="font-black text-xl text-stone-900 tracking-tight mb-1">{item.name}</h3>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{item.manufacturer}</p>
                  <p className="text-[10px] text-stone-500 font-bold mt-1.5 leading-tight">
                    1 {item.unit_type || 'Vial'} = {(item.capacity_per_unit || 1000).toLocaleString()} units
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                    {item.type}
                  </span>
                  <div className="flex items-center space-x-1 pt-1">
                    <button
                      onClick={() => {
                        setIsEditingProduct(item);
                        setFormData({
                          name: item.name,
                          type_id: item.type_id?._id || item.type_id || '',
                          manufacturer: item.manufacturer,
                          expiration_date: item.expiration_date,
                          image_url: item.image_url || '',
                          stock_quantity: item.stock_quantity || 0,
                          unit_type: item.unit_type || 'Vial',
                          capacity_per_unit: item.capacity_per_unit || 1000,
                          calc_by_vials: false,
                          vials_count: Math.round(item.stock_quantity / (item.capacity_per_unit || 1000))
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1 px-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded border border-stone-200 transition-colors flex items-center justify-center cursor-pointer"
                      title="Edit Product Details"
                    >
                      <Edit size={12} className="mr-0.5" /> <span className="text-[9px] font-extrabold uppercase">Edit</span>
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Are you sure you want to delete ${item.name} from inventory? All matching transaction histories will be removed.`)) return;
                        try {
                          await apiFetch(`/api/medicine-inventory/${item.id || item._id}`, {
                            method: 'DELETE'
                          });
                          refreshInventory();
                        } catch (err: any) {
                          alert('Error deleting: ' + err.message);
                        }
                      }}
                      className="p-1 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-200 transition-colors flex items-center justify-center cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 size={12} className="mr-0.5" /> <span className="text-[9px] font-extrabold uppercase">Del</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-stone-100 flex justify-between items-end relative z-10">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest mb-1">Current Stock</p>
                  <div className="flex items-baseline space-x-1.5">
                    <p className="text-2xl font-black text-stone-900 tracking-tighter">{(item.stock_quantity ?? 0).toLocaleString()}</p>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Units</p>
                  </div>
                  {item.capacity_per_unit && (
                    <p className="text-[10px] text-stone-500 font-bold mt-1">
                      ≈ {((item.stock_quantity || 0) / item.capacity_per_unit).toFixed(1)} {item.unit_type || 'Vial'}(s)
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest mb-1">Expires</p>
                  <p className={`text-xs font-bold ${new Date(item.expiration_date) < new Date() ? 'text-red-500' : 'text-stone-900'}`}>
                    {item.expiration_date}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Schedule timeline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card p-6 bg-white border border-stone-200/60 flex items-center justify-between shadow-sm rounded-3xl gap-4 flex-wrap sm:flex-nowrap">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                    Standard Medication & Vaccination Plan
                  </h2>
                  <p className="text-xs font-medium text-stone-400 mt-1 leading-relaxed">
                    Poultry standard age-based vaccination schedules, prophylactic medicines, and metabolic supplements computed directly for your production houses.
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPlan(null);
                    setPlanFormData({
                      name: '',
                      category: 'Vaccine',
                      ageDays: 1,
                      dosageValue: 1,
                      dosageUnit: 'dose',
                      method: '',
                      diseases: '',
                      description: '',
                      details: ''
                    });
                    setIsPlanModalOpen(true);
                  }}
                  className="btn-primary !py-2.5 px-4 text-xs font-black flex items-center bg-brand-600 text-white rounded-xl shadow-md whitespace-nowrap hover:bg-brand-700 transition-colors"
                >
                  <Plus size={14} className="mr-1" /> Add Standard Guide
                </button>
              </div>
            </div>
            
            <div className="relative border-l-2 border-stone-100 ml-4 pl-6 space-y-6">
              {plans.map((plan: any) => {
                const planId = plan.id || plan._id;
                const flockAgeMatch = flocks.some((f) => {
                  const stats = calculateFlockStats(f);
                  return Math.abs(stats.ageDaysNum - plan.ageDays) <= 3;
                });

                const displayDosage = plan.dosage || `${plan.dosageValue} ${plan.dosageUnit}${plan.dosageUnit === 'dose' || plan.dosageUnit === 'mL' ? ' / bird' : ''}`;
                const displayAge = plan.ageDisplay || (plan.ageDays === 1 ? 'Day 1' : (plan.ageDays % 7 === 0 ? `Week ${plan.ageDays / 7} (Day ${plan.ageDays})` : `Day ${plan.ageDays}`));

                return (
                  <div key={planId} className="relative group">
                    <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      flockAgeMatch ? 'bg-brand-600 border-brand-100 ring-4 ring-brand-100 shadow' : 'bg-white border-stone-300 group-hover:border-stone-500'
                    }`} />
                    
                    <div className="card p-5 hover:border-brand-200 hover:shadow-md transition-all duration-300 bg-white border border-stone-200/50 rounded-3xl">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            plan.category === 'Vaccine' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50' :
                            plan.category === 'Medicine' ? 'bg-amber-50 text-amber-600 border border-amber-100/50' :
                            'bg-sky-50 text-sky-600 border border-sky-100/50'
                          }`}>
                            {plan.category}
                          </span>
                          <span className="text-xs font-bold text-stone-400">Target: {displayAge}</span>
                        </div>
                        {flockAgeMatch && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold uppercase px-2.5 py-1 rounded-full border border-emerald-100 animate-pulse">
                            Age Matched!
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-extrabold text-stone-900 leading-tight mb-1 group-hover:text-brand-600 transition-colors">
                        {plan.name}
                      </h3>
                      <p className="text-xs font-semibold text-stone-400 mb-3 leading-relaxed">{plan.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 p-3 bg-stone-50 rounded-xl mb-4 border border-stone-100/30">
                        <div>
                          <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest leading-none mb-1">Standard Dosage</p>
                          <p className="text-xs font-black text-stone-800 flex items-center">
                            {(plan.dosageUnit || '').includes('/L') ? <Droplet size={12} className="text-blue-500 mr-1" /> : <Pill size={12} className="text-brand-500 mr-1" />}
                            {displayDosage}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest leading-none mb-1">Method of Application</p>
                          <p className="text-xs font-bold text-stone-800">{plan.method}</p>
                        </div>
                      </div>

                      {plan.details && (
                        <div className="p-3 bg-stone-50 rounded-xl mb-4 border border-stone-100/30 text-xs text-stone-500 leading-relaxed italic">
                          {plan.details}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-stone-100 mt-4 pt-4 flex-wrap gap-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Protects: {plan.diseases}</p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setIsEditingPlan(plan);
                              setPlanFormData({
                                name: plan.name,
                                category: plan.category,
                                ageDays: plan.ageDays,
                                dosageValue: plan.dosageValue,
                                dosageUnit: plan.dosageUnit || 'dose',
                                method: plan.method,
                                diseases: plan.diseases,
                                description: plan.description,
                                details: plan.details
                              });
                              setIsPlanModalOpen(true);
                            }}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200 cursor-pointer"
                            title="Edit Plan Guideline"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(planId)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 cursor-pointer"
                            title="Delete Plan Guideline"
                          >
                            <Trash2 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setCalcPlanId(planId);
                              setIsCustomTreatment(false);
                              setCalcDosageValue(plan.dosageValue);
                              setCalcDosageUnit(plan.dosageUnit || 'dose');
                              setCalcMethod(plan.method);
                              setCalcSuccessMessage(null);
                            }}
                            className="btn-secondary !py-1.5 text-xs px-3 font-black text-brand-600 border hover:bg-brand-50 border-brand-100/50 flex items-center space-x-1 shadow-sm cursor-pointer"
                          >
                            <Calculator size={13} />
                            <span>Load Plan</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Calculator core panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 bg-stone-900 border-none shadow-xl text-white relative overflow-hidden rounded-3xl">
              <div className="absolute top-0 right-0 w-32 h-32 -mr-6 -mt-6 bg-brand-500/10 rounded-full blur-3xl" />
              <div className="relative z-10 space-y-5">
                <div>
                  <h3 className="text-lg font-black tracking-tight flex items-center mb-1 text-brand-300">
                    <Calculator size={20} className="text-brand-400 mr-1.5" /> Automated Treatment Calculator
                  </h3>
                  <p className="text-stone-400 text-[11px] leading-relaxed">
                    Estimates dynamic treatment volumes automatically using live flock survivor census and daily metabolic water intake.
                  </p>
                </div>

                {calcSuccessMessage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-start space-x-2"
                  >
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{calcSuccessMessage}</span>
                  </motion.div>
                )}

                <div className="space-y-4 pt-1">
                  {/* Select House Dropdown */}
                  <div>
                    <label className="block text-[9px] text-stone-400 uppercase font-black tracking-widest mb-1.5 leading-none">1. Target Poultry House</label>
                    <select
                      className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 p-2.5 text-xs font-bold focus:outline-none focus:border-brand-500"
                      value={calcFlockId}
                      onChange={(e) => {
                        setCalcFlockId(e.target.value);
                        setCalcSuccessMessage(null);
                      }}
                    >
                      <option value="">Select Target House</option>
                      {flocks.map((f: any) => (
                        <option key={f.id} value={f.id}>House #{f.house_number} ({f.breed})</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Bird Census and Age display block */}
                  {calcFlockId && (() => {
                    const selectedFlock = flocks.find(f => f.id === calcFlockId);
                    if (!selectedFlock) return null;
                    const stats = calculateFlockStats(selectedFlock);
                    return (
                      <div className="p-3 bg-stone-800/40 rounded-xl border border-stone-800 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-stone-400 text-[10px] font-bold">Survivors Census:</span>
                          <span className="font-black text-brand-400 text-sm">{stats.totalNum.toLocaleString()} Birds</span>
                        </div>
                        <div className="grid grid-cols-2 text-[10px] text-stone-400">
                          <span>Males: {stats.maleNum.toLocaleString()}</span>
                          <span className="text-right">Females: {stats.femaleNum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t border-stone-800/50 pt-1.5 text-[10px]">
                          <span className="text-stone-400 font-bold uppercase tracking-wider">Flock Age:</span>
                          <span className="text-stone-300 font-black">{stats.ageDaysNum} Days ({stats.ageWeeksNum} Weeks)</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selection Mode Toggles */}
                  <div className="grid grid-cols-2 bg-stone-800 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTreatment(false);
                        setCalcSuccessMessage(null);
                      }}
                      className={`text-[9px] font-black uppercase py-1.5 rounded-lg transition-colors ${
                        !isCustomTreatment ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Standard Plans
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTreatment(true);
                        setCalcSuccessMessage(null);
                      }}
                      className={`text-[9px] font-black uppercase py-1.5 rounded-lg transition-colors ${
                        isCustomTreatment ? 'bg-stone-700 text-white shadow-sm' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Custom Product
                    </button>
                  </div>

                  {/* Treatment or Custom product selection options */}
                  {!isCustomTreatment ? (
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase font-black tracking-widest mb-1.5 leading-none">2. Treatment Plan</label>
                      <select
                        className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 p-2.5 text-xs font-bold focus:outline-none focus:border-brand-500"
                        value={calcPlanId}
                        onChange={(e) => {
                          setCalcPlanId(e.target.value);
                          setCalcSuccessMessage(null);
                        }}
                      >
                        {plans.map((p: any) => (
                          <option key={p.id || p._id} value={p.id || p._id}>[{p.category}] {p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase font-black tracking-widest mb-1.5 leading-none">2. Custom Product Selection</label>
                      <select
                        className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 p-2.5 text-xs font-bold focus:outline-none focus:border-brand-500"
                        value={customMedId}
                        onChange={(e) => {
                          setCustomMedId(e.target.value);
                          setCalcSuccessMessage(null);
                        }}
                      >
                        <option value="">Select Inventory Product</option>
                        {inventory?.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name} ({item.type})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Stock tracing display block */}
                  {(() => {
                    const medId = isCustomTreatment ? customMedId : linkedInventoryId;
                    const mappedItem = inventory?.find(x => (x.id === medId || x._id === medId));
                    return (
                      <div className="p-3 bg-stone-800/20 rounded-xl border border-stone-800/80 text-xs w-full">
                        <p className="text-[9px] text-stone-400 uppercase font-bold tracking-widest mb-1 leading-none">Stock Tracer</p>
                        {mappedItem ? (
                          <div className="flex justify-between items-center mt-1">
                            <span className="font-extrabold text-stone-200 truncate pr-2 text-xs">Linked: {mappedItem.name}</span>
                            <span className="shrink-0 bg-stone-700/80 text-[10px] font-bold px-2 py-0.5 rounded text-stone-300">
                              Stock: {(mappedItem.stock_quantity ?? 0).toLocaleString()} units
                            </span>
                          </div>
                        ) : (
                          <div className="text-stone-400 flex items-center space-x-1 text-[11px] mt-1 italic">
                            <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                            <span>No exact matched stock product found. Please configure custom selection to check stock.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Editable parameter values */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase font-bold mb-1 leading-none">Dosage Val</label>
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 p-2 text-xs font-bold focus:outline-none focus:border-brand-500 text-center"
                        value={calcDosageValue}
                        onChange={(e) => {
                          setCalcDosageValue(parseFloat(e.target.value) || 0);
                          setCalcSuccessMessage(null);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase font-bold mb-1 leading-none">Dosage Unit</label>
                      <select
                        className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 py-2 px-1 text-xs font-bold focus:outline-none focus:border-brand-500 text-center"
                        value={calcDosageUnit}
                        onChange={(e) => {
                          setCalcDosageUnit(e.target.value);
                          setCalcSuccessMessage(null);
                        }}
                      >
                        <option value="dose">dose</option>
                        <option value="mL">mL</option>
                        <option value="g/L">g/L</option>
                        <option value="mL/L">mL/L</option>
                        <option value="g/bird">g/bird</option>
                        <option value="mL/bird">mL/bird</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-stone-400 uppercase font-bold mb-1 leading-none">Course Days</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full bg-stone-800 text-white rounded-xl border border-stone-700/50 p-2 text-xs font-bold focus:outline-none focus:border-brand-500 text-center"
                        value={calcDays}
                        onChange={(e) => {
                          setCalcDays(parseInt(e.target.value) || 1);
                          setCalcSuccessMessage(null);
                        }}
                      />
                    </div>
                  </div>

                  {/* Calculations Result Output Block */}
                  {calcFlockId && (() => {
                    const selectedFlock = flocks.find(f => f.id === calcFlockId);
                    if (!selectedFlock) return null;
                    const stats = calculateFlockStats(selectedFlock);
                    
                    let estimateDailyWaterL = Math.ceil(stats.totalNum * 0.2);
                    let dosesNeeded = stats.totalNum * calcDosageValue * calcDays;
                    let displayAmt = '';
                    
                    if (calcDosageUnit.includes('/L')) {
                      displayAmt = `${(estimateDailyWaterL * calcDosageValue * calcDays).toLocaleString()} ${calcDosageUnit.split('/')[0] === 'g/L' ? 'grams' : 'mL'}`;
                    } else {
                      displayAmt = `${dosesNeeded.toLocaleString()} ${calcDosageUnit === 'dose' ? 'doses' : calcDosageUnit}`;
                    }

                    const medId = isCustomTreatment ? customMedId : linkedInventoryId;
                    const mappedItem = inventory?.find(x => (x.id === medId || x._id === medId));
                    let stockSufficient = true;
                    let calculatedQtyNum = calcDosageUnit.includes('/L') 
                      ? Math.round(estimateDailyWaterL * calcDosageValue * calcDays)
                      : Math.round(stats.totalNum * calcDosageValue * calcDays);
                    
                    if (mappedItem && (mappedItem.stock_quantity ?? 0) < calculatedQtyNum) {
                      stockSufficient = false;
                    }

                    return (
                      <div className="bg-brand-950/40 p-4 rounded-2xl border border-brand-800/80 space-y-3 w-full">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-brand-400 leading-none">Calculation Results</h4>
                        <div className="space-y-2 text-xs">
                          {calcDosageUnit.includes('/L') && (
                            <div className="flex justify-between bg-stone-800/50 px-2.5 py-1.5 rounded-lg border border-stone-800">
                              <span className="text-stone-400">Est. Daily Water Volume:</span>
                              <span className="font-extrabold text-sky-400 flex items-center">
                                <Droplet size={14} className="mr-1 shrink-0" /> {estimateDailyWaterL} Liters
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between bg-stone-800/80 px-3 py-2 rounded-xl border border-stone-800">
                            <span className="text-stone-300 font-bold">Total Treatment Quantity:</span>
                            <span className="font-black text-brand-400 text-sm">{displayAmt}</span>
                          </div>

                          {mappedItem && (
                            <div className="flex justify-between bg-stone-800/80 px-3 py-2 rounded-xl border border-stone-800">
                              <span className="text-stone-300 font-bold">Physical Packets/Vials Needed:</span>
                              <span className="font-black text-sky-400 text-xs flex items-center">
                                {Math.ceil(calculatedQtyNum / (mappedItem.capacity_per_unit || 1000)).toLocaleString()} {mappedItem.unit_type || 'Vial'}(s)
                                <span className="text-[9px] text-stone-400 ml-1 font-normal">({(mappedItem.capacity_per_unit || 1000).toLocaleString()} units each)</span>
                              </span>
                            </div>
                          )}

                          <div className="flex justify-between items-center p-1 pt-2 text-[10px] font-black uppercase tracking-wider">
                            <span>Inventory Status:</span>
                            {mappedItem ? (
                              stockSufficient ? (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                                  <CheckCircle2 size={12} />
                                  <span>Fully Stocked</span>
                                </span>
                              ) : (
                                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                                  <AlertTriangle size={12} />
                                  <span>Shortage: Need {(calculatedQtyNum - (mappedItem.stock_quantity ?? 0)).toLocaleString()} units</span>
                                </span>
                              )
                            ) : (
                              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-amber-300">
                                No Product Linked
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isCalculating}
                          onClick={handleLogCalculatedAdmin}
                          className="w-full btn-primary !bg-brand-600 hover:!bg-brand-500 !text-white hover:!shadow-brand-500/20 transition-all font-black text-xs py-3 rounded-xl flex items-center justify-center space-x-2"
                        >
                          <Pill size={14} />
                          <span>{isCalculating ? 'Recording Treatment...' : 'Confirm & Log Administration 🧪'}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-6">
              {isEditingProduct ? 'Edit Medicine / Vaccine' : 'New Medicine / Vaccine Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="relative w-24 h-24 bg-pastel-green-50 rounded-2xl border-2 border-dashed border-pastel-green-200 flex items-center justify-center overflow-hidden mb-2">
                  {formData.image_url ? (
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={24} className="text-pastel-green-300" />
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                </div>
                <p className="text-xs text-slate-500">Upload Picture</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medicine/Vaccine Name</label>
                <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select 
                    required 
                    className="input-field" 
                    value={formData.type_id} 
                    onChange={(e) => setFormData({ ...formData, type_id: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    {medicineTypes?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
                  <input type="text" required className="input-field" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
                <input type="date" required className="input-field" value={formData.expiration_date} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} />
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/60 space-y-3.5">
                <p className="text-xs font-black uppercase text-stone-500 tracking-wider">Unit & Stock Options</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Unit Type</label>
                    <select
                      className="input-field"
                      value={formData.unit_type}
                      onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                    >
                      <option value="Vial">Vial (e.g. Vaccines)</option>
                      <option value="Bottle">Bottle (e.g. Liquids)</option>
                      <option value="Bag">Bag (e.g. Powders)</option>
                      <option value="Box">Box (e.g. Tablets)</option>
                      <option value="Gram">Gram</option>
                      <option value="mL">mL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Doses/Size per Unit</label>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      className="input-field" 
                      placeholder="e.g. 1000" 
                      value={formData.capacity_per_unit || ''} 
                      onChange={(e) => setFormData({ ...formData, capacity_per_unit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id="calc_by_vials"
                    checked={formData.calc_by_vials}
                    onChange={(e) => setFormData({ ...formData, calc_by_vials: e.target.checked })}
                    className="rounded border-stone-300 text-brand-600"
                  />
                  <label htmlFor="calc_by_vials" className="text-xs font-bold text-stone-700 cursor-pointer selection:bg-transparent">
                    Input stock qty in {formData.unit_type}s
                  </label>
                </div>

                {formData.calc_by_vials ? (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Initial {formData.unit_type}s Count
                    </label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      className="input-field text-sm font-black" 
                      placeholder="e.g. 5" 
                      value={formData.vials_count || ''} 
                      onChange={(e) => setFormData({ ...formData, vials_count: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-[10px] text-brand-600 font-bold mt-1">
                      Calculates to: {(formData.vials_count * formData.capacity_per_unit).toLocaleString()} units/doses
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">Initial Stock (Absolute Units)</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      className="input-field text-sm font-black" 
                      placeholder="e.g. 5000" 
                      value={formData.stock_quantity || ''} 
                      onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditingProduct(null);
                    setFormData({
                      name: '',
                      type_id: '',
                      manufacturer: '',
                      expiration_date: '',
                      image_url: '',
                      stock_quantity: 0,
                      unit_type: 'Vial',
                      capacity_per_unit: 1000,
                      calc_by_vials: true,
                      vials_count: 0
                    });
                  }} 
                  className="flex-1 btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary cursor-pointer">
                  {isEditingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incoming Stock Modal */}
      {isIncomingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-6">Incoming Stock</h2>
            <form onSubmit={handleIncomingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medicine / Vaccine</label>
                <select 
                  required 
                  className="input-field" 
                  value={incomingData.medicine_id} 
                  onChange={(e) => {
                    const medId = e.target.value;
                    const selectedMed = inventory?.find(i => i.id === medId || i._id === medId);
                    setIncomingData({ 
                      ...incomingData, 
                      medicine_id: medId,
                      calc_by_vials: !!selectedMed?.capacity_per_unit,
                      vials_count: 0,
                      quantity: 0
                    });
                  }}
                >
                  <option value="">Select Item</option>
                  {inventory?.map(i => <option key={i.id || i._id} value={i.id || i._id}>{i.name} ({i.unit_type || 'Vial'} size: {i.capacity_per_unit || 1000})</option>)}
                </select>
              </div>

              {incomingData.medicine_id && (() => {
                const selectedMed = inventory?.find(i => i.id === incomingData.medicine_id || i._id === incomingData.medicine_id);
                if (!selectedMed) return null;
                const unitType = selectedMed.unit_type || 'Vial';
                const capacity = selectedMed.capacity_per_unit || 1000;

                return (
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/60 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">Stock Delivery Entry Math</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="incoming_calc_by_vials"
                        checked={incomingData.calc_by_vials}
                        onChange={(e) => setIncomingData({ ...incomingData, calc_by_vials: e.target.checked })}
                        className="rounded border-stone-300 text-brand-600 cursor-pointer"
                      />
                      <label htmlFor="incoming_calc_by_vials" className="text-xs font-bold text-stone-700 cursor-pointer">
                        Enter count in {unitType}s (1 {unitType} = {capacity.toLocaleString()} doses)
                      </label>
                    </div>

                    {incomingData.calc_by_vials ? (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Number of {unitType}s Delivered</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="input-field text-sm font-black"
                          placeholder="e.g. 5"
                          value={incomingData.vials_count || ''}
                          onChange={(e) => setIncomingData({ ...incomingData, vials_count: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-[10px] font-bold text-brand-600 mt-1">
                          Calculates to: {(incomingData.vials_count * capacity).toLocaleString()} absolute units/doses
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Quantity Delivered (Direct Units)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="input-field text-sm font-black"
                          placeholder="e.g. 5000"
                          value={incomingData.quantity || ''}
                          onChange={(e) => setIncomingData({ ...incomingData, quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
                <input type="date" required className="input-field" value={incomingData.date} onChange={(e) => setIncomingData({ ...incomingData, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="input-field min-h-[80px]" 
                  placeholder="e.g., Supplier invoice, batch number, production lab..."
                  value={incomingData.notes} 
                  onChange={(e) => setIncomingData({ ...incomingData, notes: e.target.value })}
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsIncomingModalOpen(false)} className="flex-1 btn-secondary cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 btn-primary cursor-pointer">Log Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Add New Medicine Type</h2>
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type Name</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Supplement, Antibiotic" 
                  value={newTypeName} 
                  onChange={(e) => setNewTypeName(e.target.value)} 
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsTypeModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Save Type</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Administration Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-6">Log Administration</h2>
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Medicine / Type</label>
                <select 
                  required 
                  className="input-field" 
                  value={adminData.medicine_id} 
                  onChange={(e) => {
                    const medId = e.target.value;
                    const selectedMed = inventory?.find(i => i.id === medId || i._id === medId);
                    setAdminData({ 
                      ...adminData, 
                      medicine_id: medId,
                      calc_by_vials: !!selectedMed?.capacity_per_unit,
                      vials_count: 0,
                      quantity: 0
                    });
                  }}
                >
                  <option value="">Select Item</option>
                  {inventory?.map(i => <option key={i.id || i._id} value={i.id || i._id}>{i.name} - {i.type} ({(i.stock_quantity ?? 0).toLocaleString()} left)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Flock / House</label>
                <select required className="input-field" value={adminData.flock_id} onChange={(e) => setAdminData({ ...adminData, flock_id: e.target.value })}>
                  <option value="">Select House</option>
                  {flocks.map(f => <option key={f.id} value={f.id}>House #{f.house_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Method of Administration</label>
                <input type="text" required className="input-field" placeholder="e.g. Drinking Water, Injection" value={adminData.method} onChange={(e) => setAdminData({ ...adminData, method: e.target.value })} />
              </div>

              {adminData.medicine_id && (() => {
                const selectedMed = inventory?.find(i => i.id === adminData.medicine_id || i._id === adminData.medicine_id);
                if (!selectedMed) return null;
                const unitType = selectedMed.unit_type || 'Vial';
                const capacity = selectedMed.capacity_per_unit || 1000;

                return (
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/60 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">Administration Quantity Math</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="admin_calc_by_vials"
                        checked={adminData.calc_by_vials}
                        onChange={(e) => setAdminData({ ...adminData, calc_by_vials: e.target.checked })}
                        className="rounded border-stone-300 text-brand-600 cursor-pointer"
                      />
                      <label htmlFor="admin_calc_by_vials" className="text-xs font-bold text-stone-700 cursor-pointer">
                        Log quantity in {unitType}s spent (1 {unitType} = {capacity.toLocaleString()} doses)
                      </label>
                    </div>

                    {adminData.calc_by_vials ? (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Number of {unitType}s Spent</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="input-field text-sm font-black"
                          placeholder="e.g. 1"
                          value={adminData.vials_count || ''}
                          onChange={(e) => setAdminData({ ...adminData, vials_count: parseInt(e.target.value) || 0 })}
                        />
                        <p className="text-[10px] font-bold text-brand-600 mt-1">
                          Calculates to: {(adminData.vials_count * capacity).toLocaleString()} absolute units/doses
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-bold text-stone-600 mb-1">Quantity Administered (Direct Units)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          className="input-field text-sm font-black"
                          placeholder="e.g. 1500"
                          value={adminData.quantity || ''}
                          onChange={(e) => setAdminData({ ...adminData, quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Peripherals Used</label>
                  <input type="text" className="input-field" placeholder="e.g. Syringes" value={adminData.peripherals} onChange={(e) => setAdminData({ ...adminData, peripherals: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Number Used</label>
                  <input type="number" className="input-field" value={isNaN(adminData.peripheral_quantity) ? '' : adminData.peripheral_quantity} onChange={(e) => setAdminData({ ...adminData, peripheral_quantity: parseInt(e.target.value) })} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" required className="input-field" value={adminData.date} onChange={(e) => setAdminData({ ...adminData, date: e.target.value })} />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsAdminModalOpen(false)} className="flex-1 btn-secondary cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 btn-primary cursor-pointer">Log Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Program Plan (Medication & Vaccination standard guide) Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                {isEditingPlan ? 'Edit Program Guideline' : 'New Program Guideline'}
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
                Standard Guide
              </span>
            </div>

            <form onSubmit={handlePlanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Program Name / Product Guide</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. ND + IB Vaccine (Newcastle + Infectious Bronchitis)" 
                  value={planFormData.name} 
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Category</label>
                  <select 
                    required 
                    className="input-field" 
                    value={planFormData.category} 
                    onChange={(e) => setPlanFormData({ ...planFormData, category: e.target.value })}
                  >
                    <option value="Vaccine">Vaccine</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Supplement">Supplement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Target Age (Days)</label>
                  <input 
                    type="number" 
                    required 
                    min="1" 
                    className="input-field" 
                    placeholder="e.g. 1" 
                    value={planFormData.ageDays === 0 ? '' : planFormData.ageDays} 
                    onChange={(e) => setPlanFormData({ ...planFormData, ageDays: parseInt(e.target.value) || 0 })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Dosage Value</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    min="0" 
                    className="input-field" 
                    placeholder="e.g. 1" 
                    value={planFormData.dosageValue === 0 ? '' : planFormData.dosageValue} 
                    onChange={(e) => setPlanFormData({ ...planFormData, dosageValue: parseFloat(e.target.value) || 0 })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Dosage Unit</label>
                  <select
                    className="input-field"
                    value={planFormData.dosageUnit}
                    onChange={(e) => setPlanFormData({ ...planFormData, dosageUnit: e.target.value })}
                  >
                    <option value="dose">dose / bird</option>
                    <option value="mL">mL / bird</option>
                    <option value="g/L">g / Liter of water (g/L)</option>
                    <option value="mL/L">mL / Liter of water (mL/L)</option>
                    <option value="g">g (Total)</option>
                    <option value="mL-total">mL (Total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Method of Application</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Intraocular / Eye Drop, Drinking Water, Inj." 
                  value={planFormData.method} 
                  onChange={(e) => setPlanFormData({ ...planFormData, method: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Protecting Diseases</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Newcastle Disease, Infectious Bronchitis" 
                  value={planFormData.diseases} 
                  onChange={(e) => setPlanFormData({ ...planFormData, diseases: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Short Description</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  placeholder="e.g. Primary immunization for flock protection on emergence." 
                  value={planFormData.description} 
                  onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Detailed Guide Instructions</label>
                <textarea 
                  className="input-field min-h-[80px] text-xs" 
                  placeholder="e.g. Essential first-day defense. Usually administered via spray or direct eye drops." 
                  value={planFormData.details} 
                  onChange={(e) => setPlanFormData({ ...planFormData, details: e.target.value })} 
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsPlanModalOpen(false)} 
                  className="flex-1 btn-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary bg-brand-600 text-white hover:bg-brand-700 cursor-pointer"
                >
                  Save Guideline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activePageTab === 'inventory' && (
        <>
          <div className="flex space-x-4 mt-8">
            <button onClick={handleExportIncoming} className="text-sm font-bold text-pastel-green-700 hover:text-pastel-green-800 flex items-center">
              <Download size={16} className="mr-2" /> Export Incoming History
            </button>
            <button onClick={handleExportHistory} className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center">
              <Download size={16} className="mr-2" /> Export Administration History
            </button>
          </div>

          {/* Incoming Medicine History Table */}
          <div className="card overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Incoming Medicine History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Medicine Name</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(incomingHistory || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{item.date}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{item.medicine_name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.quantity} Units</td>
                      <td className="px-6 py-4 text-slate-500 italic">{item.notes || '-'}</td>
                    </tr>
                  ))}
                  {(!incomingHistory || incomingHistory.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No incoming history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Administration History Table */}
          {history.length > 0 && (
            <div className="mt-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Administration History</h2>
              </div>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-pastel-green-50 text-pastel-green-800 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">House</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Peripherals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-pastel-green-50">
                      {history.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => {
                        const medicine = inventory?.find(i => (i.id === record.medicine_id || i._id === record.medicine_id));
                        const flock = flocks.find(f => f.id === record.flock_id);
                        return (
                          <tr key={record.id} className="hover:bg-pastel-green-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm">{record.date}</td>
                            <td className="px-6 py-4 font-bold">{medicine?.name || 'Unknown'}</td>
                            <td className="px-6 py-4">{flock ? `House #${flock.house_number}` : 'Unknown'}</td>
                            <td className="px-6 py-4">{record.quantity} Units</td>
                            <td className="px-6 py-4 text-sm">{record.method}</td>
                            <td className="px-6 py-4 text-sm">
                              {record.peripherals} {record.peripheral_quantity > 0 && `(${record.peripheral_quantity})`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
