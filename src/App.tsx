import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FarmProfile from './pages/FarmProfile';
import FlockManagement from './pages/FlockManagement';
import FeedManagement from './pages/FeedManagement';
import MortalityManagement from './pages/MortalityManagement';
import EggProduction from './pages/EggProduction';
import MedicineInventory from './pages/MedicineInventory';
import WeightManagement from './pages/WeightManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("App mounted, checking localStorage...");
    try {
      const savedUser = localStorage.getItem('farmflow_user');
      console.log("Saved user from storage:", savedUser);
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        const parsed = JSON.parse(savedUser);
        console.log("Parsed user:", parsed);
        setUser(parsed);
      }
    } catch (e) {
      console.error("Error parsing saved user:", e);
      localStorage.removeItem('farmflow_user');
    } finally {
      console.log("Loading state set to false");
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('farmflow_user', JSON.stringify(userData));
    if (userData.role === 'admin' || userData.role === 'manager' || userData.role === 'supervisor') {
      setActiveTab('dashboard');
    } else if (userData.role === 'egg_collector' || userData.role === 'flock_man') {
      setActiveTab('eggs');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('farmflow_user');
    setActiveTab('dashboard');
  };

  // Removed automatic redirect to eggs for specific roles to allow dashboard access and other modules
  useEffect(() => {
    // Initial active tab is dashboard anyway
  }, [user, activeTab]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-stone-500 font-bold tracking-widest uppercase text-xs">Loading FarmFlow...</p>
      </div>
    </div>
  );

  if (!user) {
    return isRegistering ? (
      <Register onBack={() => setIsRegistering(false)} />
    ) : (
      <Login onLogin={handleLogin} onRegister={() => setIsRegistering(true)} />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'farm': return <FarmProfile user={user} />;
      case 'flocks': return <FlockManagement user={user} />;
      case 'feeds': return <FeedManagement user={user} />;
      case 'mortality': return <MortalityManagement user={user} />;
      case 'eggs': return <EggProduction user={user} />;
      case 'medicine': return <MedicineInventory user={user} />;
      case 'weight': return <WeightManagement user={user} />;
      case 'employees': return <EmployeeManagement user={user} />;
      case 'settings': return <Settings user={user} onLogout={handleLogout} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {renderContent()}
    </Layout>
  );
}
