import { useState, useEffect } from "react";
import { SuperAdminLogin } from "@/components/super-admin-login";
import { SuperAdminDashboard } from "@/components/super-admin-dashboard";

export function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if super admin is already logged in
    const token = localStorage.getItem('super_admin_token');
    if (token) {
      // You could verify the token here if needed
      setIsAuthenticated(true);
      // For now, we'll assume the token is valid
      // In a real app, you'd verify with the server
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (token: string, adminData: any) => {
    setIsAuthenticated(true);
    setAdmin(adminData);
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    setIsAuthenticated(false);
    setAdmin(null);
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

  return <SuperAdminDashboard admin={admin} onLogout={handleLogout} />;
}