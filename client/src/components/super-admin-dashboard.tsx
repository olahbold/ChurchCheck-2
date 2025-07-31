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

interface ChurchWithStats {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string;
  bannerUrl?: string;
  brandColor?: string;
  subscriptionTier: string;
  trialStartDate?: string;
  trialEndDate?: string;
  maxMembers: number;
  totalMembers: number;
  activeMembers: number;
  totalAttendance: number;
  createdAt: string;
  updatedAt: string;
  users?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  }>;
}

interface SuperAdminDashboardProps {
  admin: any;
  onLogout: () => void;
}

export function SuperAdminDashboard({ admin, onLogout }: SuperAdminDashboardProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [churches, setChurches] = useState<ChurchWithStats[]>([]);
  const [filteredChurches, setFilteredChurches] = useState<ChurchWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChurch, setSelectedChurch] = useState<ChurchWithStats | null>(null);
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
        // Update the local state immediately for better UX
        const updatedChurches = churches.map(church => 
          church.id === churchId 
            ? { ...church, subscriptionTier: isActive ? 'starter' : 'suspended' }
            : church
        );
        setChurches(updatedChurches);
        setFilteredChurches(updatedChurches.filter(church =>
          church.name.toLowerCase().includes(searchTerm.toLowerCase())
        ));
        
        toast({
          title: "Success",
          description: `Church ${isActive ? 'activated' : 'suspended'} successfully`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update church status');
      }
    } catch (error) {
      console.error('Church status toggle error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update church status",
        variant: "destructive",
      });
    }
  };

  const handleViewChurch = async (churchId: string) => {
    try {
      const response = await fetch(`/api/super-admin/churches/${churchId}`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const churchDetails = await response.json();
        setSelectedChurch(churchDetails);
      } else {
        throw new Error('Failed to fetch church details');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load church details",
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
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewChurch(church.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {church.subscriptionTier === 'suspended' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChurchStatusToggle(church.id, true)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleChurchStatusToggle(church.id, false)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {filteredChurches.length === 0 && searchTerm && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2" />
                <p>No churches found matching "{searchTerm}"</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilteredChurches(churches);
                  }}
                  className="mt-2"
                >
                  Clear search
                </Button>
              </div>
            )}

            {filteredChurches.length === 0 && !searchTerm && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2" />
                <p>No churches registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Church Details Modal */}
        {selectedChurch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{selectedChurch.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Church Details & Statistics
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedChurch(null)}
                >
                  Close
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Basic Information</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {selectedChurch.name}</p>
                      <p><strong>Subdomain:</strong> {selectedChurch.subdomain}</p>
                      <p><strong>Subscription:</strong> 
                        <Badge className={`ml-2 ${getSubscriptionColor(selectedChurch.subscriptionTier)}`}>
                          {selectedChurch.subscriptionTier}
                        </Badge>
                      </p>
                      <p><strong>Created:</strong> {new Date(selectedChurch.createdAt).toLocaleDateString()}</p>
                      <p><strong>Max Members:</strong> {selectedChurch.maxMembers.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Statistics</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Total Members:</strong> {selectedChurch.totalMembers}</p>
                      <p><strong>Active Members:</strong> {selectedChurch.activeMembers}</p>
                      <p><strong>Total Attendance:</strong> {selectedChurch.totalAttendance}</p>
                      <p><strong>Member Utilization:</strong> {
                        selectedChurch.maxMembers > 0 
                          ? `${((selectedChurch.totalMembers / selectedChurch.maxMembers) * 100).toFixed(1)}%`
                          : 'N/A'
                      }</p>
                    </div>
                  </div>
                </div>

                {/* Trial Information */}
                {selectedChurch.subscriptionTier === 'trial' && selectedChurch.trialEndDate && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Trial Information
                    </h3>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <p><strong>Trial Started:</strong> {new Date(selectedChurch.trialStartDate).toLocaleDateString()}</p>
                      <p><strong>Trial Ends:</strong> {new Date(selectedChurch.trialEndDate).toLocaleDateString()}</p>
                      <p><strong>Days Remaining:</strong> {
                        Math.max(0, Math.ceil((new Date(selectedChurch.trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      } days</p>
                    </div>
                  </div>
                )}

                {/* Church Users */}
                {selectedChurch.users && selectedChurch.users.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Church Users ({selectedChurch.users.length})</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">Email</th>
                            <th className="text-left p-3">Role</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Last Login</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedChurch.users.map((user: any, index: number) => (
                            <tr key={user.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                              <td className="p-3">{user.firstName} {user.lastName}</td>
                              <td className="p-3">{user.email}</td>
                              <td className="p-3">
                                <Badge variant="outline">{user.role}</Badge>
                              </td>
                              <td className="p-3">
                                <Badge className={user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="p-3">
                                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Branding */}
                {(selectedChurch.logoUrl || selectedChurch.bannerUrl || selectedChurch.brandColor) && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedChurch.logoUrl && (
                        <div>
                          <p className="text-sm font-medium mb-2">Logo</p>
                          <img 
                            src={selectedChurch.logoUrl} 
                            alt="Church Logo" 
                            className="h-16 w-16 object-contain border rounded"
                          />
                        </div>
                      )}
                      {selectedChurch.bannerUrl && (
                        <div>
                          <p className="text-sm font-medium mb-2">Banner</p>
                          <img 
                            src={selectedChurch.bannerUrl} 
                            alt="Church Banner" 
                            className="h-16 w-32 object-cover border rounded"
                          />
                        </div>
                      )}
                      {selectedChurch.brandColor && (
                        <div>
                          <p className="text-sm font-medium mb-2">Brand Color</p>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: selectedChurch.brandColor }}
                            ></div>
                            <span className="text-sm font-mono">{selectedChurch.brandColor}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  {selectedChurch.subscriptionTier === 'suspended' ? (
                    <Button
                      onClick={() => {
                        handleChurchStatusToggle(selectedChurch.id, true);
                        setSelectedChurch(null);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate Church
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleChurchStatusToggle(selectedChurch.id, false);
                        setSelectedChurch(null);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend Church
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}