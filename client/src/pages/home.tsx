import { useState, useEffect } from "react";
import { TabType, AuthState, AdminUser } from "@/lib/types";
import { Church, User, LogIn } from "lucide-react";
import RegisterTab from "@/components/register-tab";
import CheckInTab from "@/components/checkin-tab";
import DashboardTab from "@/components/dashboard-tab";
import AdminTab from "@/components/admin-tab";
import VisitorsTab from "@/components/visitors-tab";
import HistoryTab from "@/components/history-tab";
import LoginModal from "@/components/login-modal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('register');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false
  });
  const [showLogin, setShowLogin] = useState(false);
  
  // Get church and user data from localStorage (SaaS authentication)
  const [churchData, setChurchData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  
  // Load authentication data on component mount
  useEffect(() => {
    const authToken = localStorage.getItem('auth_token');
    const storedChurchData = localStorage.getItem('church_data');
    const storedUserData = localStorage.getItem('user_data');
    
    if (authToken && storedChurchData && storedUserData) {
      setChurchData(JSON.parse(storedChurchData));
      setUserData(JSON.parse(storedUserData));
      setAuthState({
        isAuthenticated: true,
        user: JSON.parse(storedUserData),
        isLoading: false
      });
    }
  }, []);
  
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
    { id: 'history', label: 'History', icon: 'fa-history' },
    { id: 'visitors', label: 'Visitors', icon: 'fa-heart' },
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
    // Clear all authentication data from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('church_data');
    localStorage.removeItem('user_data');
    
    // Clear local state
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
    setChurchData(null);
    setUserData(null);
    
    // Redirect to login page
    window.location.href = '/login';
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
                <h1 className="text-xl font-semibold text-slate-900">
                  ChurchConnect
                  {churchData?.name && (
                    <>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="text-base font-normal text-slate-700">
                        {churchData.name}
                      </span>
                    </>
                  )}
                </h1>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-slate-500">Biometric Attendance System</p>
                  {churchData?.subscriptionTier && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        churchData.subscriptionTier === 'trial' 
                          ? 'bg-blue-100 text-blue-800'
                          : churchData.subscriptionTier === 'enterprise'
                          ? 'bg-purple-100 text-purple-800'
                          : churchData.subscriptionTier === 'growth'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {churchData.subscriptionTier === 'trial' ? 'Free Trial' :
                         churchData.subscriptionTier.charAt(0).toUpperCase() + churchData.subscriptionTier.slice(1)} Plan
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {userData ? `${userData.firstName} ${userData.lastName}` : 
                   authState.user ? authState.user.fullName : 'ChurchConnect User'}
                </p>
                <div className="flex items-center justify-end space-x-2">
                  {userData?.role && (
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                    </span>
                  )}
                  <p className="text-xs text-slate-500">{currentDate}</p>
                </div>
              </div>
              {authState.user ? (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {userData && userData.firstName && userData.lastName ? 
                        `${userData.firstName[0]}${userData.lastName[0]}` : 
                        authState.user?.fullName ? 
                          authState.user.fullName.split(' ').map(n => n[0]).join('') : 'U'}
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
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'visitors' && <VisitorsTab />}
        {activeTab === 'admin' && <AdminTab authState={authState} onLogout={handleLogout} />}
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
