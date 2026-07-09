import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Edit2, Upload, Mail, Phone, Calendar, Download, TrendingUp, X, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToExcel } from '../utils/excelExport';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

export default function EmployeeManagement({ user }: { user: any }) {
  const { data: employees, refresh: refreshEmployees } = useApi<any[]>('/api/employees');
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isModalOpen) {
      stopCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isModalOpen]);

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

  const handleExport = () => {
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
      'Address': emp.address,
      'Resignation Date': emp.resignation_date || 'N/A'
    }));
    exportToExcel(exportData, 'Employee_Records');
  };

  const calculateTenure = (dateHired: string, resignationDate?: string) => {
    const start = new Date(dateHired);
    const end = resignationDate ? new Date(resignationDate) : new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) return `${years}y ${months}m`;
    return `${months}m`;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee record?')) return;
    try {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      refreshEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-stone-900 mb-2">
            Employee Management
          </h1>
          <p className="text-xs md:text-base text-stone-400 font-medium max-w-2xl">
            Manage staff records, positions, and tenure information to ensure smooth farm operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center group"
          >
            <Download size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Export
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
            className="btn-primary flex items-center group"
          >
            <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> Add Employee
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {employees.map((emp) => (
          <motion.div 
            key={emp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card group overflow-hidden relative flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 border-stone-100"
          >
            <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors duration-500" />
            
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-stone-50 rounded-3xl overflow-hidden flex-shrink-0 border-4 border-white shadow-xl relative z-10 group-hover:scale-105 transition-transform duration-500">
                {emp.image_url ? (
                  <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200 bg-stone-50">
                    <Users size={40} className="group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
              </div>
              <div className={`absolute -bottom-2 -right-2 z-20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white ${emp.resignation_date ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                {emp.resignation_date ? 'Resigned' : 'Active'}
              </div>
            </div>
            
            <div className="flex-1 relative z-10 min-w-0 w-full">
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-100 px-2 py-0.5 rounded">#{emp.employee_id_no || '---'}</span>
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{calculateTenure(emp.date_hired, emp.resignation_date)} Tenure</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight truncate">{emp.name}</h3>
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-[0.15em] mt-0.5">{emp.position}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingEmployee(emp);
                      setFormData({
                        name: emp.name,
                        birthday: emp.birthday,
                        address: emp.address,
                        contact_no: emp.contact_no,
                        email: emp.email,
                        date_hired: emp.date_hired,
                        position: emp.position,
                        resignation_date: emp.resignation_date || '',
                        image_url: emp.image_url || ''
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-brand-50 rounded-xl text-stone-400 hover:text-brand-600 transition-all"
                    title="Edit Employee"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(emp.id)}
                    className="p-2 hover:bg-rose-50 rounded-xl text-stone-400 hover:text-rose-600 transition-all"
                    title="Delete Record"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 group/info">
                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover/info:bg-brand-50 group-hover/info:text-brand-600 transition-colors">
                    <Phone size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Contact</p>
                    <p className="text-xs font-bold text-stone-700 truncate">{emp.contact_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group/info">
                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover/info:bg-brand-50 group-hover/info:text-brand-600 transition-colors">
                    <Mail size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Email</p>
                    <p className="text-xs font-bold text-stone-700 truncate">{emp.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group/info">
                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover/info:bg-brand-50 group-hover/info:text-brand-600 transition-colors">
                    <Calendar size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Hired Date</p>
                    <p className="text-xs font-bold text-stone-700">{new Date(emp.date_hired).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 group/info">
                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover/info:bg-brand-50 group-hover/info:text-brand-600 transition-colors">
                    <TrendingUp size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-stone-400 uppercase font-black tracking-widest">Birthday</p>
                    <p className="text-xs font-bold text-stone-700">{new Date(emp.birthday).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                {isCameraActive ? (
                  <div className="flex flex-col items-center">
                    <div className="relative w-64 h-48 bg-stone-900 rounded-3xl overflow-hidden border border-stone-200 shadow-inner flex items-center justify-center mb-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera size={14} />
                        Capture Frame
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-32 h-32 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden mb-3 shadow-sm group/preview">
                      {formData.image_url ? (
                        <>
                          <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200">
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, image_url: '' })}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer"
                              title="Remove photo"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-stone-400">
                          <Upload size={24} className="mb-1" />
                          <span className="text-[10px] font-black uppercase tracking-wider">File Upload</span>
                        </div>
                      )}
                      {!formData.image_url && (
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-stone-200/40"
                      >
                        <Camera size={14} className="text-stone-500" />
                        Capture Photo
                      </button>
                      
                      {formData.image_url ? (
                        <button
                          type="button"
                          className="relative px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-stone-200/40"
                        >
                          <Upload size={14} className="text-stone-500" />
                          Replace File
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="relative px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border border-stone-200/40"
                        >
                          <Upload size={14} className="text-stone-500" />
                          Upload File
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                        </button>
                      )}
                    </div>
                    {cameraError && (
                      <p className="text-[11px] text-rose-500 font-bold mt-2">{cameraError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                  <input 
                    type="text" 
                    className="input-field bg-slate-50 cursor-not-allowed" 
                    value={editingEmployee ? editingEmployee.employee_id_no : 'Auto-generated'} 
                    disabled 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input type="text" required className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                  <input type="text" required className="input-field" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Birthday</label>
                  <input type="date" required className="input-field" value={formData.birthday} onChange={(e) => setFormData({ ...formData, birthday: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Hired</label>
                  <input type="date" required className="input-field" value={formData.date_hired} onChange={(e) => setFormData({ ...formData, date_hired: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact No</label>
                  <input type="text" required className="input-field" value={formData.contact_no} onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" required className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea rows={2} className="input-field" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>

              {editingEmployee && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resignation / Termination Date (Optional)</label>
                  <input type="date" className="input-field" value={formData.resignation_date} onChange={(e) => setFormData({ ...formData, resignation_date: e.target.value })} />
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
