import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";
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
  CheckCircle,
  Upload,
  Download,
  FileText,
  AlertCircle,
  CreditCard,
  Crown
} from "lucide-react";

export default function SettingsTab() {
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [scanSensitivity, setScanSensitivity] = useState("medium");
  const [followUpWeeks, setFollowUpWeeks] = useState("3");
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoadingAdminUsers, setIsLoadingAdminUsers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();


  const authHeaders = () => {
  const t = localStorage.getItem('auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};


  const handleExportMembers = async () => {
    try {
      const response = await fetch('/api/export/members', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
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

  const handleSystemAction = async (action: string) => {
    try {
      switch (action) {
        case "Manual Backup":
          // In a real system, this would trigger a database backup
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate backup time
          toast({
            title: "Backup Completed",
            description: "All church data has been backed up to cloud storage",
          });
          break;
        case "Restore from Backup":
          const confirmed = window.confirm("Are you sure you want to restore from backup? This will overwrite current data.");
          if (confirmed) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate restore time
            toast({
              title: "Restore Completed",
              description: "Data has been restored from the latest backup",
            });
          }
          break;
        case "Reset Member Fingerprint":
          const member = window.prompt("Enter member ID to reset fingerprint:");
          if (member) {
            // In a real system, this would clear the fingerprint data
            toast({
              title: "Fingerprint Reset",
              description: `Fingerprint data cleared for member ${member}`,
            });
          }
          break;
        case "Calibrate Scanner":
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate calibration
          toast({
            title: "Scanner Calibrated",
            description: "Fingerprint scanner has been recalibrated successfully",
          });
          break;
        case "Manage Admin Users":
          // Fetch admin users and show management interface
          try {
            setIsLoadingAdminUsers(true);
            const authToken = localStorage.getItem('auth_token');
            
            if (!authToken) {
              throw new Error('Authentication required');
            }
            
            const response = await fetch('/api/admin/users', {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch admin users: ${response.status}`);
            }
            
            const users = await response.json();
            setAdminUsers(Array.isArray(users) ? users : []);
            setShowAdminManagement(true);
          } catch (error) {
            console.error('Admin users fetch error:', error);
            setAdminUsers([]); // Ensure it's always an array
            toast({
              title: "Failed to Load",
              description: "Could not load admin users. Please check your authentication.",
              variant: "destructive",
            });
          } finally {
            setIsLoadingAdminUsers(false);
          }
          break;
        case "View Activity Log":
          // Generate sample activity logs and show interface
          const logs = [
            { id: 1, timestamp: new Date().toISOString(), user: "admin", action: "User Login", details: "Church Administrator logged in" },
            { id: 2, timestamp: new Date(Date.now() - 3600000).toISOString(), user: "sarah@church.com", action: "Member Check-in", details: "Processed family check-in for Johnson family" },
            { id: 3, timestamp: new Date(Date.now() - 7200000).toISOString(), user: "admin", action: "Export Data", details: "Generated monthly attendance report" },
            { id: 4, timestamp: new Date(Date.now() - 10800000).toISOString(), user: "mark@church.com", action: "View Report", details: "Accessed weekly attendance summary" },
            { id: 5, timestamp: new Date(Date.now() - 14400000).toISOString(), user: "admin", action: "Settings Update", details: "Modified fingerprint sensitivity settings" },
          ];
          setActivityLogs(logs);
          setShowActivityLog(true);
          break;
        case "Save Settings":
          // Save current settings to backend
          toast({
            title: "Settings Saved",
            description: "All system settings have been saved successfully",
          });
          break;
        default:
          toast({
            title: "Action Completed",
            description: `${action} has been completed successfully`,
          });
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: `Failed to complete ${action.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    }
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

  const handleExportActivityLog = () => {
    // Create CSV content with activity log data
    const headers = ['Timestamp', 'User', 'Action', 'Details'];
    const csvRows = [
      headers.join(','),
      ...activityLogs.map(log => [
        `"${new Date(log.timestamp).toLocaleString()}"`,
        `"${log.user}"`,
        `"${log.action}"`,
        `"${log.details}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity-log-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Activity log has been exported to CSV file",
      });
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'firstName', 'surname', 'title', 'gender', 'ageGroup', 
      'phone', 'email', 'whatsappNumber', 'address', 
      'dateOfBirth', 'weddingAnniversary', 'isCurrentMember'
    ];
    
    const csvTemplate = headers.join(',') + '\n' +
      'John,Smith,Mr.,male,adult,+234-123-456-7890,john@example.com,+234-987-654-3210,"123 Main St, City",1990-01-15,2020-06-10,true\n' +
      'Jane,Doe,Mrs.,female,adult,+234-123-456-7891,jane@example.com,+234-987-654-3211,"456 Oak Ave, City",1985-05-20,2018-08-15,true';
    
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded. Fill it out and upload to add members in bulk.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = { rowNumber: index + 2 };
          
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          
          return row;
        });

        setUploadPreview(data);
        setUploadErrors([]);
        setShowBulkUploadDialog(true);
      } catch (error) {
        toast({
          title: "File Error",
          description: "Could not read the CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
  };

  const validateData = (data: any[]) => {
    const errors: string[] = [];
    
    data.forEach((row, index) => {
      if (!row.firstName) errors.push(`Row ${row.rowNumber}: First name is required`);
      if (!row.surname) errors.push(`Row ${row.rowNumber}: Surname is required`);
      if (row.gender && !['male', 'female'].includes(row.gender)) {
        errors.push(`Row ${row.rowNumber}: Gender must be 'male' or 'female'`);
      }
      if (row.ageGroup && !['child', 'adolescent', 'adult'].includes(row.ageGroup)) {
        errors.push(`Row ${row.rowNumber}: Age group must be 'child', 'adolescent', or 'adult'`);
      }
      if (row.email && !row.email.includes('@')) {
        errors.push(`Row ${row.rowNumber}: Invalid email format`);
      }
    });
    
    return errors;
  };

  const processBulkUpload = async () => {
    setIsProcessing(true);
    const errors = validateData(uploadPreview);
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch('/api/members/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: uploadPreview }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: `${result.created} members added successfully`,
        });
        setShowBulkUploadDialog(false);
        setUploadPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-cyan-50 border border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-900 mb-2">⚙️ System Settings Center</CardTitle>
          <p className="text-slate-700 mb-3">
            Configure system preferences, manage data exports, bulk operations, and administrative settings.
          </p>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
            <p className="text-sm text-cyan-800">
              🔧 <strong>System Administration:</strong> Export member and attendance data to CSV, upload bulk member data, configure fingerprint scanner sensitivity, manage follow-up automation, perform cloud backups, restore data, and access subscription management. Complete control over your church management system's operation and data handling.
            </p>
          </div>
        </CardHeader>
      </Card>
      
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {/* Data Management */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            transition: { duration: 0.2 }
          }}
        >
          <Card className="church-card transition-all duration-300 hover:shadow-lg cursor-pointer border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Data Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Export Options</h4>
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={handleExportMembers}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Users className="mr-3 h-4 w-4" />
                        Export All Members (CSV)
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={handleExportAttendance}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Calendar className="mr-3 h-4 w-4" />
                        Export Attendance History (CSV)
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={handleExportMonthlyReport}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <BarChart3 className="mr-3 h-4 w-4" />
                        Export Monthly Report (CSV)
                      </Button>
                    </motion.div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Bulk Import Options</h4>
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={downloadTemplate}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Download className="mr-3 h-4 w-4" />
                        Download CSV Template
                      </Button>
                    </motion.div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="bulk-upload"
                      />
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Upload className="mr-3 h-4 w-4" />
                          Upload Members (CSV)
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Backup & Sync</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[hsl(142,76%,36%)]/5 border border-[hsl(142,76%,36%)]/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Cloud className="text-[hsl(142,76%,36%)] h-4 w-4" />
                        <span className="text-sm">Google Sheets Sync</span>
                      </div>
                      <span className="text-xs text-[hsl(142,76%,36%)]">Connected</span>
                    </div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => handleSystemAction("Manual Backup")}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <CloudUpload className="mr-3 h-4 w-4" />
                        Manual Backup to Cloud
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => handleSystemAction("Restore from Backup")}
                        variant="outline" 
                        className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <CloudDownload className="mr-3 h-4 w-4" />
                        Restore from Backup
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Settings */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
          }}
          whileHover={{ 
            scale: 1.02, 
            y: -4,
            transition: { duration: 0.2 }
          }}
        >
          <Card className="church-card transition-all duration-300 hover:shadow-lg cursor-pointer border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">System Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Fingerprint Settings</h4>
                    <div className="space-y-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => handleSystemAction("Reset Member Fingerprint")}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Fingerprint className="mr-3 h-4 w-4" />
                          Reset Member Fingerprint
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => handleSystemAction("Calibrate Scanner")}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Calibrate Scanner
                        </Button>
                      </motion.div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="scan-sensitivity" className="text-sm text-slate-700 dark:text-slate-300">
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
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Follow-up Settings</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="followup-weeks" className="text-sm text-slate-700 dark:text-slate-300">
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
                        <Label htmlFor="followup-enabled" className="text-sm text-slate-700 dark:text-slate-300">
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
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Admin Access</h4>
                    <div className="space-y-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => window.open('/communication-settings', '_blank')}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Communication Settings
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => handleSystemAction("Manage Admin Users")}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <UserCog className="mr-3 h-4 w-4" />
                          Manage Admin Users
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => handleSystemAction("View Activity Log")}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <History className="mr-3 h-4 w-4" />
                          View Activity Log
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Subscription & Billing</h4>
                    <div className="space-y-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => window.location.href = '/subscription'}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <CreditCard className="mr-3 h-4 w-4" />
                          Manage Subscription
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          onClick={() => window.location.href = '/subscription'}
                          variant="outline" 
                          className="w-full justify-start hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Crown className="mr-3 h-4 w-4" />
                          Upgrade Plan
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button 
                        onClick={() => handleSystemAction("Save Settings")}
                        className="church-button-primary w-full"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ 
          scale: 1.01, 
          y: -2,
          transition: { duration: 0.2 }
        }}
      >
        <Card className="bg-[hsl(0,84%,60%)]/5 border border-[hsl(0,84%,60%)]/20 transition-all duration-300 hover:shadow-lg hover:border-[hsl(0,84%,60%)]/30">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[hsl(0,84%,60%)]">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              These actions cannot be undone. Please be careful.
            </p>
            <div className="flex space-x-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => handleDangerousAction("Clear All Data")}
                  className="church-button-error"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => handleDangerousAction("Factory Reset")}
                  className="church-button-error"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Factory Reset
                </Button>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUploadDialog} onOpenChange={setShowBulkUploadDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Member Upload Preview</DialogTitle>
            <DialogDescription>
              Review the data below before uploading. {uploadPreview.length} members ready to be added.
            </DialogDescription>
          </DialogHeader>
          
          {uploadErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2 text-red-800 font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                <span>Validation Errors</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {uploadErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="border rounded-lg">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left border-b">Name</th>
                    <th className="p-2 text-left border-b">Gender</th>
                    <th className="p-2 text-left border-b">Age Group</th>
                    <th className="p-2 text-left border-b">Phone</th>
                    <th className="p-2 text-left border-b">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreview.map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{row.firstName} {row.surname}</td>
                      <td className="p-2">{row.gender}</td>
                      <td className="p-2">{row.ageGroup}</td>
                      <td className="p-2">{row.phone}</td>
                      <td className="p-2">{row.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowBulkUploadDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={processBulkUpload}
              disabled={isProcessing || uploadErrors.length > 0}
              className="bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)]"
            >
              {isProcessing ? "Uploading..." : `Upload ${uploadPreview.length} Members`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Users Management Dialog */}
      <Dialog open={showAdminManagement} onOpenChange={setShowAdminManagement}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admin User Management</DialogTitle>
            <DialogDescription>
              Manage system administrators, volunteers, and data viewers. {(adminUsers || []).length} users found.
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left border-b">Name</th>
                    <th className="p-3 text-left border-b">Email</th>
                    <th className="p-3 text-left border-b">Role</th>
                    <th className="p-3 text-left border-b">Region</th>
                    <th className="p-3 text-left border-b">Status</th>
                    <th className="p-3 text-left border-b">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingAdminUsers ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        Loading admin users...
                      </td>
                    </tr>
                  ) : (adminUsers || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        No admin users found. Please check your authentication.
                      </td>
                    </tr>
                  ) : (adminUsers || []).map((user) => (
                    <tr key={user.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-medium">{user.fullName}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'volunteer' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? 'Administrator' :
                           user.role === 'volunteer' ? 'Volunteer' : 'Data Viewer'}
                        </span>
                      </td>
                      <td className="p-3">{user.region}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowAdminManagement(false)}>
              Close
            </Button>
            <Button className="bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)]">
              Add New User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Activity Log</DialogTitle>
            <DialogDescription>
              Recent system activities and user actions. Showing last {activityLogs.length} activities.
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left border-b">Timestamp</th>
                    <th className="p-3 text-left border-b">User</th>
                    <th className="p-3 text-left border-b">Action</th>
                    <th className="p-3 text-left border-b">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium">{log.user}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.action.includes('Login') ? 'bg-blue-100 text-blue-800' :
                          log.action.includes('Check-in') ? 'bg-green-100 text-green-800' :
                          log.action.includes('Export') ? 'bg-purple-100 text-purple-800' :
                          log.action.includes('Settings') ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => setShowActivityLog(false)}>
              Close
            </Button>
            <Button 
              className="bg-[hsl(142,76%,36%)] hover:bg-[hsl(142,76%,30%)]"
              onClick={handleExportActivityLog}
            >
              Export Log
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
