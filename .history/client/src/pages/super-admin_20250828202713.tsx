import { useState, useEffect } from "react";
import { SuperAdminLogin } from "@/components/super-admin-login";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";
import { SuperAdminBusinessOps } from "@/components/super-admin-business-ops";
import { SuperAdminPlatformOps } from "@/components/super-admin-platform-ops";

export function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'business-ops' | 'platform-ops'>('dashboard');

  useEffect(() => {
    // Check if super admin is already logged in
    const token = localStorage.getItem('super_admin_token');
    if (token) {
      // Try to verify the token with the server
      verifyToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/super-admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "Login Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
        return;
      }

      setIsAuthenticated(true);
      // Set a default admin object if we don't have one
      if (!admin) {
        setAdmin({
          id: 'verified',
          email: 'admin@churchconnect.com',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'platform_admin'
        });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('super_admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (token: string, adminData: any) => {
    if (!token || !adminData) {
      console.error("Login failed: Missing token or admin data");
      return;
    }
    setIsAuthenticated(true);
    setAdmin(adminData);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    setIsAuthenticated(false);
    setAdmin(null);
    setCurrentView('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SuperAdminLogin onLogin={handleLogin} />;
  }

  if (currentView === 'business-ops') {
    return (
      <SuperAdminBusinessOps 
        onBack={() => setCurrentView('dashboard')} 
      />
    );
  }

  if (currentView === 'platform-ops') {
    return (
      <SuperAdminPlatformOps 
        onBack={() => setCurrentView('dashboard')} 
      />
    );
  }

  return (
    <SuperAdminDashboard 
      admin={admin} 
      onLogout={handleLogout}
      onNavigateToBusinessOps={() => setCurrentView('business-ops')}
      onNavigateToPlatformOps={() => setCurrentView('platform-ops')}
    />
  );
}

function toast(arg0: { title: string; description: any; variant: string; }) {
  throw new Error("Function not implemented.");
}
