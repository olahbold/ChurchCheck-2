import { useState } from "react";
import { TabType } from "@/lib/types";
import { Church, User } from "lucide-react";
import RegisterTab from "@/components/register-tab";
import CheckInTab from "@/components/checkin-tab";
import DashboardTab from "@/components/dashboard-tab";
import SettingsTab from "@/components/settings-tab";
import AdminTab from "@/components/admin-tab";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('register');
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const tabConfig = [
    { id: 'register', label: 'Register', icon: 'fa-user-plus' },
    { id: 'checkin', label: 'Check-In', icon: 'fa-fingerprint' },
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-bar' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' },
    { id: 'admin', label: 'Admin', icon: 'fa-shield-alt' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-[hsl(258,90%,66%)] rounded-lg flex items-center justify-center">
                <Church className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">ChurchConnect</h1>
                <p className="text-sm text-slate-500">Biometric Attendance System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">Admin User</p>
                <p className="text-xs text-slate-500">{currentDate}</p>
              </div>
              <div className="w-8 h-8 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                <User className="text-white text-sm" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`church-tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'register' && <RegisterTab />}
        {activeTab === 'checkin' && <CheckInTab />}
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'admin' && <AdminTab />}
      </main>
    </div>
  );
}
