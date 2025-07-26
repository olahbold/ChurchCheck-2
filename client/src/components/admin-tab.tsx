import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagementTab from "@/components/admin/user-management-tab";
import ReportsAnalyticsTab from "@/components/admin/reports-analytics-tab";
import { Shield, Users, BarChart3 } from "lucide-react";

export default function AdminTab() {
  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <Card className="church-card">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-[hsl(0,84%,60%)]/10 rounded-lg flex items-center justify-center">
              <Shield className="text-[hsl(0,84%,60%)] text-xl" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">Admin Center</CardTitle>
              <p className="text-slate-600">User access management and comprehensive analytics</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Admin Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Reports & Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserManagementTab />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}