import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MembersTab } from "@/components/admin/members-tab";
import UserManagementTab from "@/components/admin/user-management-tab";
import ReportsAnalyticsTab from "@/components/admin/reports-analytics-tab";
import SettingsTab from "@/components/settings-tab";
import { BrandingTab } from "@/components/admin/branding-tab";
import { AuthState } from "@/lib/types";
import { Shield, Users, BarChart3, Settings, LogOut, Palette, UserCog } from "lucide-react";

interface AdminTabProps {
  authState: AuthState;
  onLogout?: () => void;
}

export default function AdminTab({ authState, onLogout }: AdminTabProps) {
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: "bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)]", label: "Administrator" },
      volunteer: { color: "bg-[hsl(142,76%,36%)]/10 text-[hsl(142,76%,36%)]", label: "Volunteer" },
      data_viewer: { color: "bg-[hsl(45,93%,47%)]/10 text-[hsl(45,93%,47%)]", label: "Data Viewer" },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.volunteer;

    return (
      <Badge className={`${config.color} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  if (!authState.isAuthenticated || !authState.user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="church-card w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h3>
            <p className="text-slate-600">Please log in to access the admin section.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const getDefaultTab = () => {
    if (authState.user?.role === 'admin') return 'members';
    if (authState.user?.role === 'data_viewer') return 'reports';
    return 'members'; // fallback
  };

  const getTabsGridClass = () => {
    if (authState.user?.role === 'admin') return 'grid-cols-5';
    if (authState.user?.role === 'data_viewer') return 'grid-cols-1';
    return 'grid-cols-1';
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card className="church-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-[hsl(0,84%,60%)]/10 rounded-lg flex items-center justify-center">
                <Shield className="text-[hsl(0,84%,60%)] text-xl" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-900">Admin Center</CardTitle>
                <p className="text-slate-600">User access management and comprehensive analytics</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-sm font-medium text-slate-900">{authState.user.fullName}</span>
                {getRoleBadge(authState.user.role)}
              </div>
              <p className="text-xs text-slate-500">
                {authState.user.region && `${authState.user.region} • `}
                {authState.user.email}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin Tabs */}
      <Tabs defaultValue={getDefaultTab()} className="space-y-6">
        <TabsList className={`grid w-full h-12 ${getTabsGridClass()}`}>
          {authState.user.role === 'admin' && (
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Members</span>
            </TabsTrigger>
          )}
          {authState.user.role === 'admin' && (
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <UserCog className="h-4 w-4" />
              <span>User Management</span>
            </TabsTrigger>
          )}
          {(authState.user.role === 'admin' || authState.user.role === 'data_viewer') && (
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Reports & Analytics</span>
            </TabsTrigger>
          )}
          {authState.user.role === 'admin' && (
            <TabsTrigger value="branding" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Branding</span>
            </TabsTrigger>
          )}
          {authState.user.role === 'admin' && (
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          )}
        </TabsList>

        {authState.user.role === 'admin' && (
          <TabsContent value="members" className="space-y-6">
            <MembersTab />
          </TabsContent>
        )}

        {authState.user.role === 'admin' && (
          <TabsContent value="users" className="space-y-6">
            <UserManagementTab />
          </TabsContent>
        )}

        {(authState.user.role === 'admin' || authState.user.role === 'data_viewer') && (
          <TabsContent value="reports" className="space-y-6">
            <ReportsAnalyticsTab />
          </TabsContent>
        )}

        {authState.user.role === 'admin' && (
          <TabsContent value="branding" className="space-y-6">
            <BrandingTab />
          </TabsContent>
        )}

        {authState.user.role === 'admin' && (
          <TabsContent value="settings" className="space-y-6">
            <SettingsTab />
          </TabsContent>
        )}

        {authState.user.role === 'volunteer' && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Volunteer Access</h3>
            <p className="text-slate-600 mb-4">
              As a volunteer, you have access to the check-in functionality on the main tabs.
            </p>
            <p className="text-sm text-slate-500">
              Contact an administrator if you need additional permissions.
            </p>
          </div>
        )}
      </Tabs>
    </div>
  );
}