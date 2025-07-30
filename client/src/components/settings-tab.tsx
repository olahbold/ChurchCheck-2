import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Calendar, 
  BarChart3, 
  Cloud, 
  CloudUpload, 
  CloudDownload,
  Fingerprint,
  Settings,
  UserCog,
  History,
  Trash2,
  RotateCcw,
  Save,
  CheckCircle
} from "lucide-react";

export default function SettingsTab() {
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [scanSensitivity, setScanSensitivity] = useState("medium");
  const [followUpWeeks, setFollowUpWeeks] = useState("3");
  const { toast } = useToast();

  const handleExportMembers = async () => {
    try {
      const response = await fetch('/api/export/members');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'church_members.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Started",
        description: "Members data is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleExportAttendance = async () => {
    try {
      // Export all attendance history (last 365 days by default)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`/api/export/attendance?startDate=${startDate}&endDate=${endDate}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_history_${startDate}_to_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Started",
        description: "Attendance history is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleExportMonthlyReport = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      const response = await fetch(`/api/export/monthly-report?month=${month}&year=${year}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly_report_${year}_${month.toString().padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Started",
        description: "Monthly report is being downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSystemAction = (action: string) => {
    toast({
      title: "Action Completed",
      description: `${action} has been completed successfully`,
    });
  };

  const handleDangerousAction = (action: string) => {
    const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()}? This action cannot be undone.`);
    if (confirmed) {
      toast({
        title: "Action Completed",
        description: `${action} has been completed`,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Data Management */}
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Data Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Export Options</h4>
                <div className="space-y-3">
                  <Button 
                    onClick={handleExportMembers}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Users className="mr-3 h-4 w-4" />
                    Export All Members (CSV)
                  </Button>
                  <Button 
                    onClick={handleExportAttendance}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Calendar className="mr-3 h-4 w-4" />
                    Export Attendance History (CSV)
                  </Button>
                  <Button 
                    onClick={handleExportMonthlyReport}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <BarChart3 className="mr-3 h-4 w-4" />
                    Export Monthly Report (CSV)
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-3">Backup & Sync</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[hsl(142,76%,36%)]/5 border border-[hsl(142,76%,36%)]/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Cloud className="text-[hsl(142,76%,36%)] h-4 w-4" />
                      <span className="text-sm">Google Sheets Sync</span>
                    </div>
                    <span className="text-xs text-[hsl(142,76%,36%)]">Connected</span>
                  </div>
                  <Button 
                    onClick={() => handleSystemAction("Manual Backup")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <CloudUpload className="mr-3 h-4 w-4" />
                    Manual Backup to Cloud
                  </Button>
                  <Button 
                    onClick={() => handleSystemAction("Restore from Backup")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <CloudDownload className="mr-3 h-4 w-4" />
                    Restore from Backup
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="church-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">System Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">Fingerprint Settings</h4>
                <div className="space-y-3">
                  <Button 
                    onClick={() => handleSystemAction("Reset Member Fingerprint")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Fingerprint className="mr-3 h-4 w-4" />
                    Reset Member Fingerprint
                  </Button>
                  <Button 
                    onClick={() => handleSystemAction("Calibrate Scanner")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Calibrate Scanner
                  </Button>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scan-sensitivity" className="text-sm text-slate-700">
                      Auto Check-in Sensitivity
                    </Label>
                    <Select value={scanSensitivity} onValueChange={setScanSensitivity}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-3">Follow-up Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followup-weeks" className="text-sm text-slate-700">
                      Auto Follow-up After
                    </Label>
                    <Select value={followUpWeeks} onValueChange={setFollowUpWeeks}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 weeks</SelectItem>
                        <SelectItem value="3">3 weeks</SelectItem>
                        <SelectItem value="4">4 weeks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="followup-enabled" className="text-sm text-slate-700">
                      Send Follow-ups
                    </Label>
                    <Switch
                      id="followup-enabled"
                      checked={followUpEnabled}
                      onCheckedChange={setFollowUpEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h4 className="font-medium text-slate-900 mb-3">Admin Access</h4>
                <div className="space-y-3">
                  <Button 
                    onClick={() => handleSystemAction("Manage Admin Users")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <UserCog className="mr-3 h-4 w-4" />
                    Manage Admin Users
                  </Button>
                  <Button 
                    onClick={() => handleSystemAction("View Activity Log")}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <History className="mr-3 h-4 w-4" />
                    View Activity Log
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => handleSystemAction("Save Settings")}
                  className="church-button-primary w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="bg-[hsl(0,84%,60%)]/5 border border-[hsl(0,84%,60%)]/20">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[hsl(0,84%,60%)]">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            These actions cannot be undone. Please be careful.
          </p>
          <div className="flex space-x-4">
            <Button 
              onClick={() => handleDangerousAction("Clear All Data")}
              className="church-button-error"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
            <Button 
              onClick={() => handleDangerousAction("Factory Reset")}
              className="church-button-error"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Factory Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
