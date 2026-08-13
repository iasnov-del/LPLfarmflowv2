import React, { useState } from 'react';
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
  Search, 
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel } from '../utils/excelExport';
import { useApi } from '../hooks/useApi';
import { apiFetch } from '../utils/api';

export default function EmployeeManagement({ user }: { user: any }) {
  const { data: employees, refresh: refreshEmployees } = useApi<any[]>('/api/employees');

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

  // Search filter for staff list
  const [staffSearch, setStaffSearch] = useState('');

  // Handle Image File Upload (Profile Picture)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size must be under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Employee Submit (Create / Edit)
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await apiFetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      setEditingEmployee(null);
      refreshEmployees();
    } catch (err: any) {
      alert("Error saving employee profile: " + (err.message || 'Unknown error'));
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff record?")) return;
    try {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      refreshEmployees();
    } catch (err: any) {
      alert("Error deleting employee: " + (err.message || 'Unknown error'));
    }
  };

  // Export Staff Roster to Excel
  const handleExportStaff = () => {
    if (!employees || employees.length === 0) {
      alert("No staff records available to export.");
      return;
    }
    const dataToExport = employees.map(emp => ({
      'Employee ID': emp.employee_id_no,
      'Full Name': emp.name,
      'Position': emp.position,
      'Birthday': emp.birthday,
      'Date Hired': emp.date_hired,
      'Contact No': emp.contact_no,
      'Email': emp.email,
      'Address': emp.address,
      'Status': emp.resignation_date ? `Resigned (${emp.resignation_date})` : 'Active'
    }));
    exportToExcel(dataToExport, `Staff_Roster_${new Date().toISOString().split('T')[0]}`);
  };

  // Helper for calculating tenure
  const calculateTenure = (hiredStr: string, resignedStr?: string) => {
    if (!hiredStr) return 'N/A';
    const hired = new Date(hiredStr);
    const end = resignedStr ? new Date(resignedStr) : new Date();
    const years = end.getFullYear() - hired.getFullYear();
    const months = end.getMonth() - hired.getMonth();
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    
    if (totalMonths < 12) {
      return `${totalMonths} mo${totalMonths === 1 ? '' : 's'}`;
    }
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y} yr${y === 1 ? '' : 's'}${m > 0 ? ` ${m} mo` : ''}`;
  };

  // Filtered staff
  const filteredEmployees = (employees || []).filter(emp => {
    const query = staffSearch.toLowerCase();
    return (
      (emp.name || '').toLowerCase().includes(query) ||
      (emp.employee_id_no || '').toLowerCase().includes(query) ||
      (emp.position || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users size={24} className="text-amber-700" />
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">Personnel & Staff Roster</h1>
          </div>
          <p className="text-xs text-stone-500 font-medium mt-1">
            Manage farm workforce records, contact details, positions, and employment tenure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportStaff}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
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
            className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus size={16} /> Add Staff Member
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search employee name, ID, or position..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 text-xs font-bold text-stone-600">
          <span>Total Personnel: <strong className="text-stone-900">{(employees || []).length}</strong></span>
          <span>•</span>
          <span>Active Staff: <strong className="text-emerald-700">{(employees || []).filter(e => !e.resignation_date).length}</strong></span>
        </div>
      </div>

      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-stone-400 font-bold">
          No personnel profiles found. Click "Add Staff Member" to register a new employee.
        </div>
      ) : (
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
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center justify-center text-amber-800 font-black text-lg">
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
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center pb-2 border-b border-stone-100">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                    Profile Picture (Optional)
                  </label>
                  <div className="w-24 h-24 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden mb-3 relative group">
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
                        <Upload size={20} className="mx-auto mb-1" />
                        <span className="text-[10px] font-bold uppercase">No Photo</span>
                      </div>
                    )}
                  </div>

                  <label className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
                    <Upload size={14} /> Upload Profile Photo
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
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
    </div>
  );
}
