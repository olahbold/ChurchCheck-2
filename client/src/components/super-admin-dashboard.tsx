import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  Calendar, 
  Activity, 
  Search, 
  Settings,
  LogOut,
  Shield,
  Eye,
  Ban,
  CheckCircle
} from "lucide-react";

interface PlatformStats {
  totalChurches: number;
  totalMembers: number;
  totalAttendance: number;
  activeChurches: number;
}

interface Church {
  id: string;
  name: string;
  subscriptionTier: string;
  totalMembers: number;
  activeMembers: number;
  totalAttendance: number;
  createdAt: string;
}

interface SuperAdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

export function SuperAdminDashboard({ admin, onLogout }: SuperAdminDashboardProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [filteredChurches, setFilteredChurches] = useState<Church[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('super_admin_token')}`,
    'Content-Type': 'application/json',
  });

  const loadDashboardData = async () => {
    try {
      const [statsResponse, churchesResponse] = await Promise.all([
        fetch('/api/super-admin/dashboard', { headers: getAuthHeaders() }),
        fetch('/api/super-admin/churches', { headers: getAuthHeaders() })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (churchesResponse.ok) {
        const churchesData = await churchesResponse.json();
        setChurches(churchesData);
        setFilteredChurches(churchesData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = churches.filter(church =>
      church.name.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredChurches(filtered);
  };

  const handleChurchStatusToggle = async (churchId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/super-admin/churches/${churchId}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        await loadDashboardData(); // Reload data
        toast({
          title: "Success",
          description: `Church ${isActive ? 'activated' : 'suspended'} successfully`,
        });
      } else {
        throw new Error('Failed to update church status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update church status",
        variant: "destructive",
      });
    }
  };

  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'trial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'starter': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'growth': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
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
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  ChurchConnect Super Admin
                </h1>
                <p className="text-sm text-gray-500">Platform Management Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {admin.firstName} {admin.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Churches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChurches || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeChurches || 0} active this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
              <p className="text-xs text-muted-foreground">Across all churches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAttendance || 0}</div>
              <p className="text-xs text-muted-foreground">All-time records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Churches</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeChurches || 0}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Churches Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Churches Management</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search churches..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredChurches.map((church) => (
                <div
                  key={church.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{church.name}</h3>
                      <Badge className={getSubscriptionColor(church.subscriptionTier)}>
                        {church.subscriptionTier}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-6 mt-2 text-sm text-muted-foreground">
                      <span>{church.totalMembers} members</span>
                      <span>{church.activeMembers} active</span>
                      <span>{church.totalAttendance} attendance records</span>
                      <span>Created {new Date(church.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {church.subscriptionTier === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChurchStatusToggle(church.id, true)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChurchStatusToggle(church.id, false)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}