import { useState } from "react";
import { TabType, AuthState, AdminUser } from "@/lib/types";
import { Church, User, LogIn } from "lucide-react";
import RegisterTab from "@/components/register-tab";
import CheckInTab from "@/components/checkin-tab";
import DashboardTab from "@/components/dashboard-tab";
import AdminTab from "@/components/admin-tab";
import LoginModal from "@/components/login-modal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('register');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false
  });
  const [showLogin, setShowLogin] = useState(false);
  
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
    { id: 'admin', label: 'Admin', icon: 'fa-shield-alt' },
  ];

  const handleAdminTabClick = () => {
    if (!authState.isAuthenticated) {
      setShowLogin(true);
    } else {
      setActiveTab('admin');
    }
  };

  const handleLogin = (user: AdminUser) => {
    setAuthState({
      isAuthenticated: true,
      user,
      isLoading: false
    });
    setShowLogin(false);
    setActiveTab('admin');
  };

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
    setActiveTab('register');
  };

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
                <p className="text-sm font-medium text-slate-900">
                  {authState.user ? authState.user.fullName : 'ChurchConnect User'}
                </p>
                <p className="text-xs text-slate-500">{currentDate}</p>
              </div>
              {authState.user ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {authState.user.fullName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center">
                  <User className="text-white text-sm" />
                </div>
              )}
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
                onClick={() => tab.id === 'admin' ? handleAdminTabClick() : setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[hsl(258,90%,66%)] text-[hsl(258,90%,66%)]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                <span>{tab.label}</span>
                {tab.id === 'admin' && !authState.isAuthenticated && (
                  <LogIn className="h-3 w-3 ml-1" />
                )}
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
        {activeTab === 'admin' && <AdminTab authState={authState} />}
      </main>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)} 
        onLogin={handleLogin} 
      />
    </div>
  );
}
