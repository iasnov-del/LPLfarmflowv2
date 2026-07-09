import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Bird, 
  Beef, 
  Skull, 
  Egg, 
  Pill, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  Warehouse,
  Scale,
  Download,
  Smartphone,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../utils/api';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, user, onLogout, activeTab, setActiveTab }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [farm, setFarm] = useState<any>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [activeInstallTab, setActiveInstallTab] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
      setActiveInstallTab('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
      setActiveInstallTab('android');
    } else {
      setDeviceType('desktop');
      setActiveInstallTab('desktop');
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const fetchFarm = async () => {
      try {
        const farmData = await apiFetch('/api/farm');
        if (farmData) {
          setFarm(farmData);
        }
      } catch (error) {
        console.error("Error fetching farm profile:", error);
      }
    };
    fetchFarm();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'worker', 'supervisor', 'egg_collector', 'flock_man'] },
    { id: 'farm', label: 'Farm Profile', icon: Home, roles: ['admin', 'manager'] },
    { id: 'flocks', label: 'Flocks', icon: Bird, roles: ['admin', 'manager', 'worker', 'supervisor'] },
    { id: 'feeds', label: 'Feeds', icon: Beef, roles: ['admin', 'manager', 'worker', 'supervisor', 'flock_man'] },
    { id: 'mortality', label: 'Mortality', icon: Skull, roles: ['admin', 'manager', 'worker', 'supervisor', 'flock_man'] },
    { id: 'eggs', label: 'Eggs', icon: Egg, roles: ['admin', 'manager', 'worker', 'supervisor', 'egg_collector', 'flock_man'] },
    { id: 'medicine', label: 'Medicine', icon: Pill, roles: ['admin', 'manager', 'worker', 'supervisor'] },
    { id: 'weight', label: 'Weight', icon: Scale, roles: ['admin', 'manager', 'worker', 'supervisor', 'flock_man'] },
    { id: 'employees', label: 'Staff', icon: Users, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));
  
  // Bottom nav items for mobile (limit to 4-5)
  const bottomNavItems = filteredMenu.slice(0, 4);

  return (
    <div className="flex h-screen bg-white overflow-hidden flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="hidden md:flex bg-stone-50/50 border-r border-stone-100 flex-col z-20"
      >
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-600/30 overflow-hidden p-1">
                {farm?.logo_url ? (
                  <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Default Logo" className="w-full h-full object-contain brightness-0 invert" />
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                FarmFlow<span className="text-brand-600">Pro</span>
              </h1>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 hover:bg-white rounded-2xl text-stone-400 hover:text-stone-900 transition-all shadow-sm border border-transparent hover:border-stone-100"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto py-2">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full sidebar-item ${
                activeTab === item.id 
                  ? 'sidebar-item-active' 
                  : 'sidebar-item-inactive'
              }`}
            >
              <item.icon size={20} className={isSidebarOpen ? 'mr-3.5' : 'mx-auto'} />
              {isSidebarOpen && <span className="text-sm tracking-tight">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-stone-100 bg-stone-50/80">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className={`w-full mb-4 flex items-center justify-center gap-2 p-3 rounded-xl text-brand-600 bg-brand-50 border border-brand-100 hover:bg-brand-100/50 transition-all font-bold text-xs ${!isSidebarOpen && 'p-2'}`}
            title="Download App for Apple or Android"
          >
            <Download size={14} className="animate-bounce" />
            {isSidebarOpen && <span>Download App</span>}
          </button>
          {isSidebarOpen && (
            <div className="flex items-center space-x-3 px-2 mb-6">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-stone-400 font-bold text-sm shadow-sm border border-stone-100">
                {user.fullName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-900 truncate tracking-tight">{user.fullName}</p>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center p-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={20} className={isSidebarOpen ? 'mr-3.5' : ''} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-brand-600/20 overflow-hidden p-1">
            {farm?.logo_url ? (
              <img src={farm.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Default Logo" className="w-full h-full object-contain brightness-0 invert" />
            )}
          </div>
          <h1 className="text-base font-bold tracking-tight text-stone-900">
            FarmFlow<span className="text-brand-600">Pro</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-stone-50 rounded-lg text-stone-500"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-4/5 max-w-xs bg-white z-50 shadow-2xl md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between border-b border-stone-50">
                <span className="font-bold text-stone-900">Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-stone-50 rounded-lg text-stone-400"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all font-medium ${
                      activeTab === item.id 
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' 
                        : 'text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    <item.icon size={20} className="mr-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="p-6 border-t border-stone-50">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-400 font-bold">
                    {user.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900">{user.fullName}</p>
                    <p className="text-xs text-stone-400 uppercase tracking-wider">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsInstallModalOpen(true);
                  }}
                  className="w-full mb-4 flex items-center justify-center gap-2 p-3.5 rounded-xl text-brand-700 bg-brand-50 border border-brand-100 font-bold transition-all hover:bg-brand-100/50 text-sm animate-pulse-subtle"
                >
                  <Download size={18} className="animate-bounce text-brand-600" />
                  <span>Download App (Apple/Android)</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center p-4 rounded-xl text-red-500 bg-red-50 font-bold transition-all"
                >
                  <LogOut size={20} className="mr-3" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 relative pb-24 md:pb-12 bg-stone-50/30">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-4 py-2 flex items-center justify-around z-30 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
        {bottomNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'text-brand-600' 
                : 'text-stone-400'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] mt-1 font-bold uppercase tracking-tight">{item.label}</span>
          </button>
        ))}
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center p-2 text-stone-400"
        >
          <Menu size={20} />
          <span className="text-[10px] mt-1 font-bold uppercase tracking-tight">More</span>
        </button>
      </nav>

      {/* PWA / App Download & Installation Modal */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-stone-100 max-w-lg w-full overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-stone-100 flex items-start justify-between bg-stone-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-600/20 overflow-hidden p-2.5 shrink-0">
                    <img src="https://cdn-icons-png.flaticon.com/512/3656/3656403.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert animate-pulse-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">Download App</h3>
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">For Apple, Android & Desktop</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-stone-100 bg-stone-50/30 p-2 gap-1.5 shrink-0">
                <button
                  onClick={() => setActiveInstallTab('ios')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeInstallTab === 'ios'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <Smartphone size={14} />
                  Apple (iOS)
                  {deviceType === 'ios' && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase text-white shrink-0">Current</span>}
                </button>
                <button
                  onClick={() => setActiveInstallTab('android')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeInstallTab === 'android'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <Smartphone size={14} />
                  Android
                  {deviceType === 'android' && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase text-white shrink-0">Current</span>}
                </button>
                <button
                  onClick={() => setActiveInstallTab('desktop')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeInstallTab === 'desktop'
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <Laptop size={14} />
                  Desktop
                  {deviceType === 'desktop' && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full font-black uppercase text-white shrink-0">Current</span>}
                </button>
              </div>

              {/* Content area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                <p className="text-sm text-stone-500 leading-relaxed">
                  Download <strong>FarmFlow Pro</strong> as a lightweight native app. This gives you instant home screen launch, faster load speeds, and full-screen standalone view.
                </p>

                {activeInstallTab === 'ios' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 text-amber-900 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed font-medium">
                      <div className="text-amber-600 shrink-0 mt-0.5 font-bold">⚠️</div>
                      <div>
                        <strong>Safari Browser Required:</strong> Apple iOS requires Apple Safari to add PWAs to the Home Screen. If you are inside another browser (like Chrome, Firefox, or Facebook), copy the URL and open it in Safari first.
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Tap the <strong className="text-stone-800">Share</strong> button in Safari's toolbar (represented by a square with an arrow pointing up <span className="inline-block px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-bold">⬆</span> at the bottom of your iPhone screen, or top of iPad screen).
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Scroll down the share sheet options and tap <strong className="text-stone-800">"Add to Home Screen"</strong> (represented by a plus sign icon inside a square <span className="inline-block px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-bold">＋</span>).
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Customize the name to "FarmFlow Pro" and tap <strong className="text-stone-800">"Add"</strong> in the top-right corner. The app will immediately download to your device's home screen!
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center">
                      <div className="w-full bg-stone-50 border border-stone-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-500">
                          <Download size={20} className="animate-bounce text-brand-600" />
                        </div>
                        <p className="text-xs font-bold text-stone-800">Instant Access on iOS</p>
                        <p className="text-[10px] text-stone-400 max-w-[280px]">Once added, FarmFlow Pro operates as a native Apple app with safe background caches!</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeInstallTab === 'android' && (
                  <div className="space-y-4">
                    {deferredPrompt ? (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 text-center space-y-4">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Install Automatically</p>
                        <h4 className="text-sm font-bold text-stone-900">One-Click Android Installation Available</h4>
                        <button
                          onClick={handleInstallClick}
                          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download size={16} className="animate-bounce" />
                          Install Now
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-2xl p-4 text-xs leading-relaxed font-medium">
                        <strong>Automatic Install Support:</strong> Android Chrome fully supports automatic installation. If you don't see the "Install Now" button above, follow the easy manual steps below.
                      </div>
                    )}

                    <div className="space-y-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Tap the <strong className="text-stone-800">Menu</strong> icon (represented by three vertical dots <span className="inline-block px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-bold">⋮</span> in Chrome's top-right corner).
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Select <strong className="text-stone-800">"Install app"</strong> or <strong className="text-stone-800">"Add to Home screen"</strong> from the drop-down menu list.
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Confirm the installation. Android will register the application package and place the app launcher directly on your device.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeInstallTab === 'desktop' && (
                  <div className="space-y-4">
                    {deferredPrompt ? (
                      <div className="bg-brand-50/50 border border-brand-100 rounded-3xl p-6 text-center space-y-4">
                        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest">Install Automatically</p>
                        <h4 className="text-sm font-bold text-stone-900">One-Click Desktop Installation Available</h4>
                        <button
                          onClick={handleInstallClick}
                          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download size={16} className="animate-bounce" />
                          Install Desktop Client
                        </button>
                      </div>
                    ) : (
                      <div className="bg-stone-50 border border-stone-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2 text-stone-500">
                        <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                          <Laptop size={16} />
                        </div>
                        <p className="text-xs font-bold text-stone-800">Browser Install Icon</p>
                        <p className="text-[11px] leading-relaxed max-w-[340px] text-stone-500">
                          Look at your browser's address bar (URL bar) at the top of the window. Click the <strong className="text-stone-700">Install icon</strong> (an arrow pointing down inside a circle or laptop icon) to download and launch the desktop application.
                        </p>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Click the browser menu button (three dots <span className="inline-block px-1.5 py-0.5 bg-stone-100 rounded text-[10px] font-bold">⋮</span> in the top-right corner of Chrome or Edge).
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
                        <div className="text-xs text-stone-600 font-medium">
                          Select <strong className="text-stone-800">"Save and share"</strong> ➜ <strong className="text-stone-800">"Install FarmFlow Pro..."</strong> from the menu list.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setIsInstallModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

