import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Upload, 
  Mail, 
  Phone, 
  Calendar, 
  Download, 
  Trash2, 
  X, 
  Camera, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Scan, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  Filter, 
  RefreshCw, 
  Eye, 
  Maximize2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '../utils/excelExport';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

export default function EmployeeManagement({ user }: { user: any }) {
  const { data: employees, refresh: refreshEmployees } = useApi<any[]>('/api/employees');
  
  // Active Tab: 'kiosk' | 'dtr' | 'staff'
  const [activeTab, setActiveTab] = useState<'kiosk' | 'dtr' | 'staff'>('kiosk');

  // Employee Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    birthday: '',
    address: '',
    contact_no: '',
    email: '',
    date_hired: new Date().toISOString().split('T')[0],
    position: '',
    resignation_date: '',
    image_url: ''
  });

  // Modal Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Kiosk State
  const kioskVideoRef = useRef<HTMLVideoElement>(null);
  const kioskStreamRef = useRef<MediaStream | null>(null);
  const [isKioskCameraActive, setIsKioskCameraActive] = useState(false);
  const [kioskCameraError, setKioskCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedKioskEmpId, setSelectedKioskEmpId] = useState<string>('');
  const [kioskScanAction, setKioskScanAction] = useState<'clock_in' | 'clock_out' | 'auto'>('auto');
  const [lastScanResult, setLastScanResult] = useState<any | null>(null);

  // DTR State
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState<string>(todayStr);
  const [filterEmpId, setFilterEmpId] = useState<string>('');
  const { data: dtrRecords, refresh: refreshDtr } = useApi<any[]>(
    `/api/dtr?${filterDate ? `date=${filterDate}` : ''}${filterEmpId ? `&employee_id=${filterEmpId}` : ''}`
  );

  // Manual DTR Modal State
  const [isManualDtrOpen, setIsManualDtrOpen] = useState(false);
  const [manualDtrData, setManualDtrData] = useState({
    employee_id: '',
    date: todayStr,
    time_in: '08:00:00 AM',
    time_out: '05:00:00 PM',
    status: 'present',
    notes: ''
  });

  // Photo Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; url: string } | null>(null);

  // Search filter for staff list
  const [staffSearch, setStaffSearch] = useState('');

  // Camera Management for Add/Edit Modal
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 400, height: 400, facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setCameraError("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFormData(prev => ({ ...prev, image_url: dataUrl }));
      }
    }
    stopCamera();
  };

  // Camera Management for Kiosk Station
  const startKioskCamera = async () => {
    setKioskCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      kioskStreamRef.current = stream;
      if (kioskVideoRef.current) {
        kioskVideoRef.current.srcObject = stream;
      }
      setIsKioskCameraActive(true);
    } catch (err: any) {
      console.error("Kiosk camera error:", err);
      setKioskCameraError("Unable to access camera for facial recognition kiosk. Please check camera permissions.");
      setIsKioskCameraActive(false);
    }
  };

  const stopKioskCamera = () => {
    if (kioskStreamRef.current) {
      kioskStreamRef.current.getTracks().forEach(track => track.stop());
      kioskStreamRef.current = null;
    }
    setIsKioskCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'kiosk') {
      startKioskCamera();
    } else {
      stopKioskCamera();
    }
    return () => {
      stopKioskCamera();
    };
  }, [activeTab]);

  useEffect(() => {
    if (!isModalOpen) {
      stopCamera();
    }
  }, [isModalOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await apiFetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/employees', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      
      setIsModalOpen(false);
      setEditingEmployee(null);
      setFormData({
        name: '',
        birthday: '',
        address: '',
        contact_no: '',
        email: '',
        date_hired: new Date().toISOString().split('T')[0],
        position: '',
        resignation_date: '',
        image_url: ''
      });
      refreshEmployees();
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee record and associated attendance history?')) return;
    try {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      refreshEmployees();
      refreshDtr();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  // Facial Recognition Verification via Kiosk
  const handlePerformFacialScan = async () => {
    if (!kioskVideoRef.current) return;
    setIsScanning(true);
    setLastScanResult(null);

    const video = kioskVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsScanning(false);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const capturedImageBase64 = canvas.toDataURL('image/jpeg', 0.85);

    try {
      const res = await apiFetch('/api/dtr/verify-face', {
        method: 'POST',
        body: JSON.stringify({
          captured_image: capturedImageBase64,
          action: kioskScanAction,
          selected_employee_id: selectedKioskEmpId || undefined
        })
      });

      setLastScanResult({
        success: true,
        action: res.action,
        time: res.time,
        date: res.date,
        confidence: res.confidence,
        reason: res.reason,
        employee: res.employee,
        dtr: res.dtr
      });

      refreshDtr();
    } catch (err: any) {
      console.error("Facial scan error:", err);
      setLastScanResult({
        success: false,
        error: err.message || "Facial recognition match failed or confidence score too low."
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Manual DTR submit
  const handleSaveManualDtr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/dtr/manual', {
        method: 'POST',
        body: JSON.stringify(manualDtrData)
      });
      setIsManualDtrOpen(false);
      refreshDtr();
    } catch (err) {
      console.error("Error saving manual DTR:", err);
    }
  };

  const handleDeleteDtr = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this DTR log entry?")) return;
    try {
      await apiFetch(`/api/dtr/${id}`, { method: 'DELETE' });
      refreshDtr();
    } catch (err) {
      console.error("Error deleting DTR entry:", err);
    }
  };

  // Export Staff / DTR to Excel
  const handleExportStaff = () => {
    if (!employees) return;
    const exportData = employees.map(emp => ({
      'Employee ID': emp.employee_id_no,
      'Name': emp.name,
      'Position': emp.position,
      'Birthday': emp.birthday,
      'Date Hired': emp.date_hired,
      'Tenure': calculateTenure(emp.date_hired, emp.resignation_date),
      'Contact No': emp.contact_no,
      'Email': emp.email,
      'Facial Profile': emp.image_url ? 'Registered' : 'Missing Photo',
      'Address': emp.address,
      'Resignation Date': emp.resignation_date || 'N/A'
    }));
    exportToExcel(exportData, 'Employee_Master_Records');
  };

  const handleExportDtr = () => {
    if (!dtrRecords) return;
    const exportData = dtrRecords.map(rec => ({
      'Date': rec.date,
      'Employee ID': rec.employee_id?.employee_id_no || 'N/A',
      'Employee Name': rec.employee_id?.name || 'Unknown',
      'Position': rec.employee_id?.position || 'N/A',
      'Time In': rec.time_in || 'N/A',
      'Time Out': rec.time_out || 'N/A',
      'Hours Worked': calculateHoursWorked(rec.time_in, rec.time_out),
      'Status': rec.status,
      'Time-In Confidence': rec.time_in_verification_confidence ? `${rec.time_in_verification_confidence}%` : 'Manual',
      'Notes': rec.notes || ''
    }));
    exportToExcel(exportData, `Daily_Time_Record_${filterDate || 'All'}`);
  };

  const calculateTenure = (dateHired: string, resignationDate?: string) => {
    if (!dateHired) return 'N/A';
    const start = new Date(dateHired);
    const end = resignationDate ? new Date(resignationDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) return `${years}y ${months}m`;
    return `${months}m`;
  };

  const calculateHoursWorked = (timeIn?: string, timeOut?: string) => {
    if (!timeIn || !timeOut) return 'In Progress';
    try {
      const parseTime = (tStr: string) => {
        const date = new Date();
        const match = tStr.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)?/i);
        if (!match) return date;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[4];
        if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
        date.setHours(hours, minutes, 0, 0);
        return date;
      };

      const start = parseTime(timeIn);
      const end = parseTime(timeOut);
      let diffMs = end.getTime() - start.getTime();
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
      const hours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      return `${hours} hrs`;
    } catch (e) {
      return 'N/A';
    }
  };

  const filteredEmployees = (employees || []).filter(e => 
    e.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    e.employee_id_no?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    e.position?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black tracking-widest uppercase rounded-full flex items-center gap-1.5">
              <ShieldCheck size={14} /> Biometric Bi-Directional Attendance
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-stone-900">
            Employee Daily Time Record
          </h1>
          <p className="text-sm text-stone-500 font-medium max-w-2xl mt-1">
            Facial recognition biometric time clock station & staff daily attendance logs.
          </p>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center gap-2 p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kiosk' 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Scan size={16} className={activeTab === 'kiosk' ? 'text-emerald-400 animate-pulse' : ''} />
            Biometric Scanner Station
          </button>
          
          <button
            onClick={() => setActiveTab('dtr')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dtr' 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Clock size={16} />
            Attendance Logs (DTR)
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'staff' 
                ? 'bg-stone-900 text-white shadow-md' 
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Users size={16} />
            Staff Roster
          </button>
        </div>
      </header>

      {/* TAB 1: BIOMETRIC FACIAL RECOGNITION SCANNER STATION */}
      {activeTab === 'kiosk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Camera Viewport Area */}
          <div className="lg:col-span-7 bg-stone-900 text-white p-6 rounded-3xl shadow-xl border border-stone-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-xs font-black tracking-wider uppercase text-stone-300">
                  Biometric Facial Time-Clock Terminal
                </span>
              </div>
              <span className="text-[11px] font-mono text-stone-400 bg-stone-800 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Video Canvas Container */}
            <div className="relative w-full aspect-4/3 bg-black rounded-2xl overflow-hidden border border-stone-800 flex items-center justify-center group">
              {isKioskCameraActive ? (
                <>
                  <video 
                    ref={kioskVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100" 
                  />

                  {/* Face Alignment Overlay Frame */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="relative w-64 h-72 border-2 border-emerald-400/80 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center justify-center transition-all duration-300">
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 px-3 py-1 bg-stone-900/90 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">
                        Align Face Here
                      </div>
                      
                      {/* Scanning Line Animation */}
                      {isScanning && (
                        <motion.div 
                          className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8">
                  <Camera size={48} className="mx-auto text-stone-600 mb-3 animate-bounce" />
                  <p className="text-sm font-bold text-stone-300 mb-2">Camera is Offline or Inactive</p>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
                    {kioskCameraError || "Please click below to activate your webcam for facial recognition."}
                  </p>
                  <button
                    onClick={startKioskCamera}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg"
                  >
                    Turn On Camera
                  </button>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-800/80 p-4 rounded-2xl border border-stone-700/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-bold text-stone-300 whitespace-nowrap">Mode:</label>
                <select
                  value={kioskScanAction}
                  onChange={(e) => setKioskScanAction(e.target.value as any)}
                  className="bg-stone-900 border border-stone-700 text-white text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500 w-full sm:w-auto"
                >
                  <option value="auto">⚡ Auto Detect (Smart Clock-In / Out)</option>
                  <option value="clock_in">☀️ Force Time In</option>
                  <option value="clock_out">🌙 Force Time Out</option>
                </select>
              </div>

              <button
                disabled={!isKioskCameraActive || isScanning}
                onClick={handlePerformFacialScan}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-black rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-95"
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-stone-900" />
                    Analyzing Facial Biometrics...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Scan Face & Clock Record
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Side Panel: Scan Result & Staff Quick Select */}
          <div className="lg:col-span-5 space-y-6">
            {/* Scan Status Alert Card */}
            <AnimatePresence mode="wait">
              {lastScanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-6 rounded-3xl border shadow-lg ${
                    lastScanResult.success 
                      ? 'bg-emerald-900/10 border-emerald-500/30 text-stone-900' 
                      : 'bg-rose-900/10 border-rose-500/30 text-stone-900'
                  }`}
                >
                  {lastScanResult.success ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-emerald-700">
                        <CheckCircle2 size={28} className="text-emerald-600" />
                        <div>
                          <h3 className="font-black text-lg tracking-tight">Attendance Logged Successfully</h3>
                          <span className="text-xs font-bold text-emerald-800">
                            Biometric Confidence: {lastScanResult.confidence}%
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-white rounded-2xl border border-stone-200/80 space-y-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          {lastScanResult.employee?.image_url ? (
                            <img 
                              src={lastScanResult.employee.image_url} 
                              alt="Staff" 
                              className="w-12 h-12 rounded-xl object-cover border border-stone-200" 
                            />
                          ) : (
                            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center font-bold text-stone-600">
                              {lastScanResult.employee?.name?.[0] || 'E'}
                            </div>
                          )}
                          <div>
                            <p className="font-black text-stone-900">{lastScanResult.employee?.name}</p>
                            <p className="text-xs text-stone-500 font-bold">
                              ID: {lastScanResult.employee?.employee_id_no} • {lastScanResult.employee?.position}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                          <div>
                            <span className="text-stone-400 font-bold block">LOG ACTION</span>
                            <span className={`font-black uppercase ${
                              lastScanResult.action === 'time_in' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {lastScanResult.action === 'time_in' ? '☀️ TIME IN' : '🌙 TIME OUT'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-stone-400 font-bold block">RECORDED TIME</span>
                            <span className="font-black text-stone-900">{lastScanResult.time}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-stone-500 italic">"{lastScanResult.reason}"</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-rose-700">
                        <AlertCircle size={28} className="text-rose-600" />
                        <div>
                          <h3 className="font-black text-base">Facial Recognition Unsuccessful</h3>
                          <p className="text-xs text-rose-800 font-medium">{lastScanResult.error}</p>
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Tip: You can manually select an employee below to assist the biometric verification or ensure light sources are facing you.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Candidate Override Box */}
            <div className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-4">
              <div>
                <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Filter size={16} className="text-stone-500" />
                  Staff Pre-Selection (Optional Override)
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Select staff before scanning to compare directly against their registered facial profile.
                </p>
              </div>

              <select
                value={selectedKioskEmpId}
                onChange={(e) => setSelectedKioskEmpId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl p-3 outline-none focus:border-stone-400"
              >
                <option value="">-- All Active Employees (Auto Match Any) --</option>
                {(employees || []).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_id_no} - {emp.name} ({emp.position}) {emp.image_url ? '✓ Photo Ready' : '⚠️ No Photo'}
                  </option>
                ))}
              </select>

              {/* Registered Photo Indicator Summary */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-600">Facial Profiles Registered:</span>
                <span className="font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  {(employees || []).filter(e => !!e.image_url).length} of {(employees || []).length} Staff
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE LOGS (DTR TABLE) */}
      {activeTab === 'dtr' && (
        <div className="space-y-6">
          {/* Filters & Export Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-stone-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-stone-400"
                />
              </div>

              <select
                value={filterEmpId}
                onChange={(e) => setFilterEmpId(e.target.value)}
                className="bg-stone-50 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-stone-400"
              >
                <option value="">All Staff Members</option>
                {(employees || []).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_no})
                  </option>
                ))}
              </select>

              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="text-xs text-stone-500 hover:text-stone-900 underline font-bold"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setManualDtrData({
                    employee_id: employees?.[0]?.id || '',
                    date: todayStr,
                    time_in: '08:00:00 AM',
                    time_out: '05:00:00 PM',
                    status: 'present',
                    notes: ''
                  });
                  setIsManualDtrOpen(true);
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} /> Manual Log Entry
              </button>

              <button
                onClick={handleExportDtr}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet size={16} /> Export DTR
              </button>
            </div>
          </div>

          {/* DTR Records Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-extrabold">
                    <th className="p-4">Date</th>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Position</th>
                    <th className="p-4">Time In</th>
                    <th className="p-4">Time Out</th>
                    <th className="p-4">Hours</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Captured Photos</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {(!dtrRecords || dtrRecords.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-stone-400 font-bold">
                        No attendance records found for the selected filter date.
                      </td>
                    </tr>
                  ) : (
                    dtrRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="p-4 font-bold text-stone-900 whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            {rec.employee_id?.image_url ? (
                              <img 
                                src={rec.employee_id.image_url} 
                                alt="" 
                                className="w-8 h-8 rounded-full object-cover border border-stone-200" 
                              />
                            ) : (
                              <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center font-bold text-stone-500 text-[10px]">
                                {rec.employee_id?.name?.[0] || 'E'}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-stone-900">{rec.employee_id?.name || 'Unknown Staff'}</p>
                              <span className="text-[10px] text-stone-400 font-mono">{rec.employee_id?.employee_id_no}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-stone-600 font-semibold">
                          {rec.employee_id?.position || 'N/A'}
                        </td>
                        <td className="p-4">
                          {rec.time_in ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-200/60 inline-block">
                              ☀️ {rec.time_in}
                            </span>
                          ) : (
                            <span className="text-stone-300">--</span>
                          )}
                        </td>
                        <td className="p-4">
                          {rec.time_out ? (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-200/60 inline-block">
                              🌙 {rec.time_out}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                              Active / Working
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-stone-800">
                          {calculateHoursWorked(rec.time_in, rec.time_out)}
                        </td>
                        <td className="p-4">
                          {rec.time_in_verification_confidence ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full flex items-center gap-1 w-max">
                              <ShieldCheck size={12} /> {rec.time_in_verification_confidence}% Biometric
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-stone-100 text-stone-600 font-bold text-[10px] rounded-full w-max">
                              Manual Log
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {rec.time_in_photo && (
                              <button
                                onClick={() => setPreviewPhoto({
                                  title: `Time-In Capture (${rec.employee_id?.name} - ${rec.time_in})`,
                                  url: rec.time_in_photo
                                })}
                                className="p-1 hover:bg-stone-100 rounded border border-stone-200 text-stone-600 transition-colors cursor-pointer"
                                title="View Time-In Photo"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            {rec.time_out_photo && (
                              <button
                                onClick={() => setPreviewPhoto({
                                  title: `Time-Out Capture (${rec.employee_id?.name} - ${rec.time_out})`,
                                  url: rec.time_out_photo
                                })}
                                className="p-1 hover:bg-stone-100 rounded border border-stone-200 text-blue-600 transition-colors cursor-pointer"
                                title="View Time-Out Photo"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteDtr(rec.id)}
                            className="p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF ROSTER */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search employee name, ID, or position..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:border-stone-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportStaff}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={16} /> Export Roster
              </button>

              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setFormData({
                    name: '',
                    birthday: '',
                    address: '',
                    contact_no: '',
                    email: '',
                    date_hired: new Date().toISOString().split('T')[0],
                    position: '',
                    resignation_date: '',
                    image_url: ''
                  });
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={16} /> Register Staff
              </button>
            </div>
          </div>

          {/* Employees Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => (
              <div 
                key={emp.id}
                className="p-6 bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {emp.image_url ? (
                      <img 
                        src={emp.image_url} 
                        alt={emp.name} 
                        className="w-14 h-14 rounded-2xl object-cover border border-stone-200 shadow-sm" 
                      />
                    ) : (
                      <div className="w-14 h-14 bg-stone-100 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-stone-400 font-bold text-lg">
                        {emp.name?.[0] || 'E'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-stone-900 text-base">{emp.name}</h3>
                      <p className="text-xs font-bold text-amber-700">{emp.position}</p>
                      <span className="text-[10px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {emp.employee_id_no}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setFormData({
                          name: emp.name || '',
                          birthday: emp.birthday || '',
                          address: emp.address || '',
                          contact_no: emp.contact_no || '',
                          email: emp.email || '',
                          date_hired: emp.date_hired || new Date().toISOString().split('T')[0],
                          position: emp.position || '',
                          resignation_date: emp.resignation_date || '',
                          image_url: emp.image_url || ''
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-stone-100 text-stone-500 rounded-lg transition-colors cursor-pointer"
                      title="Edit Employee"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete Employee"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Facial Profile Badge */}
                <div className="mb-4">
                  {emp.image_url ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-full border border-emerald-200/60 inline-flex items-center gap-1">
                      <ShieldCheck size={12} /> Facial Profile Ready
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-[10px] rounded-full border border-amber-200/60 inline-flex items-center gap-1">
                      <AlertCircle size={12} /> No Photo (Facial Scan Unavailable)
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-stone-600 pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-stone-400" />
                    <span>{emp.contact_no || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-stone-400" />
                    <span className="truncate">{emp.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-stone-400" />
                    <span>Hired: {emp.date_hired} ({calculateTenure(emp.date_hired, emp.resignation_date)})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <h2 className="text-xl font-black text-stone-900">
                  {editingEmployee ? 'Edit Staff Profile' : 'Register New Employee'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitEmployee} className="space-y-4">
                {/* Photo Capture Section */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Facial Recognition Profile Photo
                  </label>
                  {isCameraActive ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-48 h-48 bg-black rounded-2xl overflow-hidden mb-3 border-2 border-emerald-500">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition-colors"
                        >
                          Take Snapshot
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 py-2 bg-stone-200 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden mb-3 relative group">
                        {formData.image_url ? (
                          <>
                            <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, image_url: '' })}
                              className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold transition-opacity"
                            >
                              Remove Photo
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-stone-400 p-2">
                            <Upload size={24} className="mx-auto mb-1" />
                            <span className="text-[10px] font-bold uppercase">No Photo Set</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera size={14} /> Capture Webcam
                        </button>
                        <label className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                          <Upload size={14} /> Upload File
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                      {cameraError && <p className="text-xs text-rose-500 font-bold mt-2">{cameraError}</p>}
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Employee ID</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-500 cursor-not-allowed" 
                      value={editingEmployee ? editingEmployee.employee_id_no : 'Auto-generated'} 
                      disabled 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                    <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Position / Role</label>
                    <input type="text" required className="input-field" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Birthday</label>
                    <input type="date" required className="input-field" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Date Hired</label>
                    <input type="date" required className="input-field" value={formData.date_hired} onChange={(e) => setFormData({ ...formData, date_hired: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Contact No</label>
                    <input type="text" required className="input-field" value={formData.contact_no} onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Email</label>
                    <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Address</label>
                    <input type="text" className="input-field" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>

                {editingEmployee && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Resignation / Termination Date (Optional)</label>
                    <input type="date" className="input-field" value={formData.resignation_date} onChange={(e) => setFormData({ ...formData, resignation_date: e.target.value })} />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    Save Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MANUAL DTR ENTRY */}
      <AnimatePresence>
        {isManualDtrOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-stone-200 max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
                <h2 className="text-lg font-black text-stone-900">Manual Attendance Entry</h2>
                <button onClick={() => setIsManualDtrOpen(false)} className="text-stone-400 hover:text-stone-900">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveManualDtr} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Select Staff Member</label>
                  <select
                    required
                    value={manualDtrData.employee_id}
                    onChange={(e) => setManualDtrData({ ...manualDtrData, employee_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">-- Select Employee --</option>
                    {(employees || []).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_id_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualDtrData.date}
                    onChange={(e) => setManualDtrData({ ...manualDtrData, date: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Time In</label>
                    <input
                      type="text"
                      placeholder="08:00:00 AM"
                      value={manualDtrData.time_in}
                      onChange={(e) => setManualDtrData({ ...manualDtrData, time_in: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Time Out</label>
                    <input
                      type="text"
                      placeholder="05:00:00 PM"
                      value={manualDtrData.time_out}
                      onChange={(e) => setManualDtrData({ ...manualDtrData, time_out: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Status</label>
                  <select
                    value={manualDtrData.status}
                    onChange={(e) => setManualDtrData({ ...manualDtrData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="completed">Completed Shift</option>
                    <option value="half_day">Half Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Notes / Reason</label>
                  <textarea
                    rows={2}
                    placeholder="Manual entry added by supervisor..."
                    value={manualDtrData.notes}
                    onChange={(e) => setManualDtrData({ ...manualDtrData, notes: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button type="button" onClick={() => setIsManualDtrOpen(false)} className="flex-1 btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 btn-primary">
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PHOTO PREVIEW MODAL */}
      <AnimatePresence>
        {previewPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-stone-900 text-white rounded-3xl p-6 max-w-lg w-full border border-stone-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-sm text-stone-200">{previewPhoto.title}</h3>
                <button onClick={() => setPreviewPhoto(null)} className="p-1 text-stone-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="aspect-4/3 bg-black rounded-2xl overflow-hidden border border-stone-800">
                <img src={previewPhoto.url} alt="Preview" className="w-full h-full object-contain" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
