import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Enhanced animated counter with spring effect
function AnimatedCounter({ target, duration = 2500, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for spring-like effect
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      const easedProgress = easeOutBack(progress);
      const currentCount = Math.floor(easedProgress * target);
      setCount(Math.min(currentCount, target));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [target, duration]);
  
  return (
    <motion.span
      key={target}
      initial={{ scale: 1.2, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }}
    >
      {count}{suffix}
    </motion.span>
  );
}
import { 
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  Building2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  MessageSquare,
  UserCheck,
  BarChart3,
  Globe,
  Zap,
  RefreshCw,
  Download,
  Plus,
  Mail,
  ArrowUpCircle,
  ArrowDownCircle,
  Play,
  Pause,
  FileText,
  Upload,
  Search
} from "lucide-react";

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  cpu: number;
  memory: number;
  disk: number;
  database: {
    status: 'connected' | 'disconnected';
    responseTime: number;
    connections: number;
  };
  api: {
    responseTime: number;
    successRate: number;
    requestsPerMinute: number;
  };
}

interface SuperAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'platform_admin' | 'support_admin';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  churchId: string;
  churchName: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  assignedTo?: string;
}

interface PlatformAnalytics {
  userGrowth: number;
  featureAdoption: {
    memberManagement: number;
    attendanceTracking: number;
    visitorCheckin: number;
    reports: number;
  };
  geographicDistribution: Array<{
    country: string;
    churches: number;
    percentage: number;
  }>;
  revenueForecasting: {
    next30Days: number;
    next90Days: number;
    confidence: number;
  };
}

interface ChurchForManagement {
  id: string;
  name: string;
  subscriptionTier: string;
  totalMembers: number;
  isActive: boolean;
  createdAt: string;
  lastActivity?: string;
}

interface SuperAdminPlatformOpsProps {
  onBack: () => void;
}

export function SuperAdminPlatformOps({ onBack }: SuperAdminPlatformOpsProps) {
  const [activeTab, setActiveTab] = useState('health');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalytics | null>(null);
  const [churchesForManagement, setChurchesForManagement] = useState<ChurchForManagement[]>([]);
  const [selectedChurches, setSelectedChurches] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const { toast } = useToast();

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('super_admin_token')}`,
    'Content-Type': 'application/json',
  });

  const loadPlatformData = async () => {
    try {
      setIsLoading(true);
      
      // Load system health
      const healthResponse = await fetch('/api/super-admin/system-health', {
        headers: getAuthHeaders(),
      });
      if (healthResponse.ok) {
        setSystemHealth(await healthResponse.json());
      }

      // Load super admin users
      const adminsResponse = await fetch('/api/super-admin/admin-users', {
        headers: getAuthHeaders(),
      });
      if (adminsResponse.ok) {
        setSuperAdmins(await adminsResponse.json());
      }

      // Load support tickets
      const ticketsResponse = await fetch('/api/super-admin/support-tickets', {
        headers: getAuthHeaders(),
      });
      if (ticketsResponse.ok) {
        setSupportTickets(await ticketsResponse.json());
      }

      // Load platform analytics
      const analyticsResponse = await fetch('/api/super-admin/platform-analytics', {
        headers: getAuthHeaders(),
      });
      if (analyticsResponse.ok) {
        setPlatformAnalytics(await analyticsResponse.json());
      }

      // Load churches for management
      const churchesResponse = await fetch('/api/super-admin/churches', {
        headers: getAuthHeaders(),
      });
      if (churchesResponse.ok) {
        const allChurches = await churchesResponse.json();
        setChurchesForManagement(allChurches.map((church: any) => ({
          id: church.id,
          name: church.name,
          subscriptionTier: church.subscriptionTier,
          totalMembers: church.totalMembers || 0,
          isActive: church.subscriptionTier !== 'suspended',
          createdAt: church.createdAt,
          lastActivity: church.lastActivity || church.updatedAt
        })));
      }

    } catch (error) {
      console.error('Failed to load platform data:', error);
      toast({
        title: "Error",
        description: "Failed to load platform operations data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'resolved':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
      case 'in_progress':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
      case 'disconnected':
      case 'urgent':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'critical':
      case 'disconnected':
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedChurches.length === 0) {
      toast({
        title: "Error",
        description: "Please select an action and at least one church",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsBulkProcessing(true);
      
      const response = await fetch('/api/super-admin/bulk-church-action', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: bulkAction,
          churchIds: selectedChurches
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Bulk Action Complete",
          description: `Successfully processed ${result.successCount} of ${result.totalRequested} churches.`,
        });

        // Reset selections and reload data
        setSelectedChurches([]);
        setBulkAction('');
        loadPlatformData();
      } else {
        throw new Error('Failed to execute bulk action');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      toast({
        title: "Error",
        description: "Failed to execute bulk action",
        variant: "destructive",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSelectAllChurches = (checked: boolean) => {
    if (checked) {
      setSelectedChurches(churchesForManagement.map(c => c.id));
    } else {
      setSelectedChurches([]);
    }
  };

  const handleSelectChurch = (churchId: string, checked: boolean) => {
    if (checked) {
      setSelectedChurches(prev => [...prev, churchId]);
    } else {
      setSelectedChurches(prev => prev.filter(id => id !== churchId));
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading platform operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                ← Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Platform Operations
                </h1>
                <p className="text-sm text-gray-500">Advanced Management & Monitoring</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlatformData}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>System Health</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Management</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Support</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* System Health Tab */}
          <TabsContent value="health" className="space-y-6">
            {systemHealth && (
              <>
                {/* System Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <Card className={`h-[140px] stat-card-hover ${
                      systemHealth.status === 'critical' 
                        ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-red-200 dark:border-red-800'
                        : systemHealth.status === 'warning'
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800'
                        : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800'
                    } hover:shadow-lg transition-all duration-300`}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${
                          systemHealth.status === 'critical' 
                            ? 'text-red-700 dark:text-red-300'
                            : systemHealth.status === 'warning'
                            ? 'text-yellow-700 dark:text-yellow-300'
                            : 'text-green-700 dark:text-green-300'
                        }`}>System Status</CardTitle>
                        <div className={`${getStatusColor(systemHealth.status)} pulse-icon`}>
                          {getStatusIcon(systemHealth.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold capitalize mb-2 ${
                          systemHealth.status === 'critical' 
                            ? 'text-red-900 dark:text-red-100'
                            : systemHealth.status === 'warning'
                            ? 'text-yellow-900 dark:text-yellow-100'
                            : 'text-green-900 dark:text-green-100'
                        }`}>{systemHealth.status}</div>
                        <p className={`text-xs ${
                          systemHealth.status === 'critical' 
                            ? 'text-red-600 dark:text-red-400'
                            : systemHealth.status === 'warning'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          Uptime: <AnimatedCounter target={Math.floor(systemHealth.uptime / 3600)} />h <AnimatedCounter target={Math.floor((systemHealth.uptime % 3600) / 60)} />m
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">CPU Usage</CardTitle>
                        <Cpu className="h-5 w-5 text-blue-600 dark:text-blue-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                          <AnimatedCounter target={systemHealth.cpu} suffix="%" />
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mt-3">
                          <motion.div 
                            className={`h-1.5 rounded-full ${
                              systemHealth.cpu > 80 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 
                              systemHealth.cpu > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${systemHealth.cpu}%` }}
                            transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Memory Usage</CardTitle>
                        <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                          <AnimatedCounter target={systemHealth.memory} suffix="%" />
                        </div>
                        <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5 mt-3">
                          <motion.div 
                            className={`h-1.5 rounded-full ${
                              systemHealth.memory > 80 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 
                              systemHealth.memory > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-violet-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${systemHealth.memory}%` }}
                            transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">API Response</CardTitle>
                        <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-2">
                          <AnimatedCounter target={systemHealth.api.responseTime} suffix="ms" />
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          <AnimatedCounter target={systemHealth.api.successRate} suffix="%" /> success rate
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Database & API Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                          <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400 pulse-icon" />
                          <span>Database Health</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 dark:text-emerald-300">Status</span>
                          <div className={`flex items-center space-x-2 ${getStatusColor(systemHealth.database.status)}`}>
                            {getStatusIcon(systemHealth.database.status)}
                            <span className="capitalize font-medium">{systemHealth.database.status}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 dark:text-emerald-300">Response Time</span>
                          <span className="font-mono text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            <AnimatedCounter target={systemHealth.database.responseTime} suffix="ms" />
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-700 dark:text-emerald-300">Active Connections</span>
                          <span className="font-mono text-lg font-bold text-emerald-900 dark:text-emerald-100">
                            <AnimatedCounter target={systemHealth.database.connections} />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                          <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400 pulse-icon" />
                          <span>API Performance</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-700 dark:text-indigo-300">Average Response Time</span>
                          <span className="font-mono text-lg font-bold text-indigo-900 dark:text-indigo-100">
                            <AnimatedCounter target={systemHealth.api.responseTime} suffix="ms" />
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-700 dark:text-indigo-300">Success Rate</span>
                          <span className="font-mono text-lg font-bold text-indigo-900 dark:text-indigo-100">
                            <AnimatedCounter target={systemHealth.api.successRate} suffix="%" />
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-700 dark:text-indigo-300">Requests/Minute</span>
                          <span className="font-mono text-lg font-bold text-indigo-900 dark:text-indigo-100">
                            <AnimatedCounter target={systemHealth.api.requestsPerMinute} />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management" className="space-y-6">
            {/* Bulk Church Operations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Church Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bulk Actions */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedChurches.length === churchesForManagement.length && churchesForManagement.length > 0}
                      onCheckedChange={handleSelectAllChurches}
                    />
                    <span className="text-sm font-medium">
                      {selectedChurches.length} of {churchesForManagement.length} selected
                    </span>
                  </div>
                  
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suspend">Suspend Churches</SelectItem>
                      <SelectItem value="activate">Activate Churches</SelectItem>
                      <SelectItem value="upgrade_to_growth">Upgrade to Growth</SelectItem>
                      <SelectItem value="upgrade_to_enterprise">Upgrade to Enterprise</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleBulkAction}
                    disabled={selectedChurches.length === 0 || !bulkAction || isBulkProcessing}
                    variant="default"
                  >
                    {isBulkProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Action
                  </Button>
                </div>

                {/* Churches List */}
                <div className="space-y-3">
                  {churchesForManagement.slice(0, 10).map((church) => (
                    <div key={church.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedChurches.includes(church.id)}
                          onCheckedChange={(checked) => handleSelectChurch(church.id, checked as boolean)}
                        />
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{church.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {church.totalMembers} members • Created {new Date(church.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={church.isActive ? "default" : "secondary"}>
                          {church.isActive ? "Active" : "Suspended"}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {church.subscriptionTier}
                        </Badge>
                        {church.subscriptionTier === 'enterprise' && (
                          <ArrowUpCircle className="h-4 w-4 text-green-600" />
                        )}
                        {church.subscriptionTier === 'suspended' && (
                          <Pause className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Super Admin Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Super Admin Users</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {superAdmins.map((admin) => (
                    <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <UserCheck className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{admin.firstName} {admin.lastName}</p>
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={admin.isActive ? "default" : "secondary"}>
                          {admin.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{admin.role.replace('_', ' ')}</Badge>
                        <p className="text-sm text-muted-foreground">
                          {admin.lastLoginAt 
                            ? `Last login: ${new Date(admin.lastLoginAt).toLocaleDateString()}`
                            : 'Never logged in'
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Support Tickets</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{ticket.churchName}</span>
                          <Badge 
                            variant={ticket.priority === 'urgent' ? "destructive" : 
                                   ticket.priority === 'high' ? "default" : "secondary"}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{ticket.subject}</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={ticket.status === 'resolved' ? "default" : "outline"}
                          className={getStatusColor(ticket.status)}
                        >
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {platformAnalytics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">User Growth</CardTitle>
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                          +<AnimatedCounter target={platformAnalytics.userGrowth} suffix="%" />
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">Month over month</p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Revenue Forecast</CardTitle>
                        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                          $<AnimatedCounter target={platformAnalytics.revenueForecasting.next30Days} />
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Next 30 days (<AnimatedCounter target={platformAnalytics.revenueForecasting.confidence} suffix="%" /> confidence)
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                  >
                    <Card className="h-[140px] stat-card-hover bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950 dark:to-violet-950 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Top Feature</CardTitle>
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400 pulse-icon" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
                          <AnimatedCounter target={platformAnalytics.featureAdoption.memberManagement} suffix="%" />
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Member Management adoption</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                        <Globe className="h-5 w-5 text-slate-600 dark:text-slate-400 pulse-icon" />
                        <span>Geographic Distribution</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {platformAnalytics.geographicDistribution.map((geo, index) => (
                          <motion.div 
                            key={index} 
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300">{geo.country}</span>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                <AnimatedCounter target={geo.churches} /> churches
                              </span>
                              <div className="w-24 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <motion.div 
                                  className="h-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${geo.percentage}%` }}
                                  transition={{ duration: 1.5, delay: 0.8 + (index * 0.1), ease: "easeOut" }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 w-12">
                                <AnimatedCounter target={geo.percentage} suffix="%" />
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}