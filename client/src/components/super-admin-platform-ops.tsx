import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Status</CardTitle>
                      <div className={getStatusColor(systemHealth.status)}>
                        {getStatusIcon(systemHealth.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">{systemHealth.status}</div>
                      <p className="text-xs text-muted-foreground">
                        Uptime: {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{systemHealth.cpu}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            systemHealth.cpu > 80 ? 'bg-red-500' : 
                            systemHealth.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemHealth.cpu}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{systemHealth.memory}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full ${
                            systemHealth.memory > 80 ? 'bg-red-500' : 
                            systemHealth.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${systemHealth.memory}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">API Response</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{systemHealth.api.responseTime}ms</div>
                      <p className="text-xs text-muted-foreground">
                        {systemHealth.api.successRate}% success rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Database & API Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Database className="h-5 w-5" />
                        <span>Database Health</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Status</span>
                        <div className={`flex items-center space-x-2 ${getStatusColor(systemHealth.database.status)}`}>
                          {getStatusIcon(systemHealth.database.status)}
                          <span className="capitalize">{systemHealth.database.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Response Time</span>
                        <span>{systemHealth.database.responseTime}ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Active Connections</span>
                        <span>{systemHealth.database.connections}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Server className="h-5 w-5" />
                        <span>API Performance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Average Response Time</span>
                        <span>{systemHealth.api.responseTime}ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Success Rate</span>
                        <span>{systemHealth.api.successRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Requests/Minute</span>
                        <span>{systemHealth.api.requestsPerMinute}</span>
                      </div>
                    </CardContent>
                  </Card>
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
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">User Growth</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">+{platformAnalytics.userGrowth}%</div>
                      <p className="text-xs text-muted-foreground">Month over month</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${platformAnalytics.revenueForecasting.next30Days}</div>
                      <p className="text-xs text-muted-foreground">
                        Next 30 days ({platformAnalytics.revenueForecasting.confidence}% confidence)
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Feature</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{platformAnalytics.featureAdoption.memberManagement}%</div>
                      <p className="text-xs text-muted-foreground">Member Management adoption</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <span>Geographic Distribution</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {platformAnalytics.geographicDistribution.map((geo, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span>{geo.country}</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">{geo.churches} churches</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-primary rounded-full"
                                style={{ width: `${geo.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-12">{geo.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}