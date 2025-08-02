import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, UserPlus, Download, Edit, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EditMemberForm } from "./edit-member-form";
import { queryClient } from "@/lib/queryClient";

interface Member {
  id: string;
  firstName: string;
  surname: string;
  title?: string;
  gender: 'male' | 'female';
  ageGroup: 'child' | 'adolescent' | 'adult';
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  dateOfBirth?: string;
  weddingAnniversary?: string;
  fingerprintId?: string;
  parentId?: string;
  isCurrentMember: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemberStats {
  total: number;
  active: number;
  newThisMonth: number;
  lastThirtyDays: number;
}

export function MembersTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats>({ total: 0, active: 0, newThisMonth: 0, lastThirtyDays: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [ageGroupFilter, setAgeGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, genderFilter, ageGroupFilter, statusFilter]);

  const loadMembers = async () => {
    try {
      const membersData = await apiRequest('/api/members');
      setMembers(membersData);
      calculateStats(membersData);
    } catch (error) {
      console.error('Failed to load members:', error);
      toast({
        title: "Error",
        description: "Failed to load members.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (membersData: Member[]) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: membersData.length,
      active: membersData.filter(m => m.isCurrentMember).length,
      newThisMonth: membersData.filter(m => new Date(m.createdAt) >= startOfMonth).length,
      lastThirtyDays: membersData.filter(m => new Date(m.createdAt) >= thirtyDaysAgo).length,
    };

    setStats(stats);
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        `${member.firstName} ${member.surname}`.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.phone?.includes(term)
      );
    }

    // Gender filter
    if (genderFilter !== "all") {
      filtered = filtered.filter(member => member.gender === genderFilter);
    }

    // Age group filter
    if (ageGroupFilter !== "all") {
      filtered = filtered.filter(member => member.ageGroup === ageGroupFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(member => 
        statusFilter === "active" ? member.isCurrentMember : !member.isCurrentMember
      );
    }

    setFilteredMembers(filtered);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleSaveMember = () => {
    setIsEditDialogOpen(false);
    setSelectedMember(null);
    loadMembers(); // Reload the members list
    queryClient.invalidateQueries({ queryKey: ['/api/members'] });
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setSelectedMember(null);
  };

  const handleExportMembers = async () => {
    try {
      const response = await fetch('/api/export/members-fresh', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `members_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Members data has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export members data.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAgeGroupBadge = (ageGroup: string) => {
    const colors = {
      child: "bg-blue-100 text-blue-800",
      adolescent: "bg-green-100 text-green-800",
      adult: "bg-purple-100 text-purple-800"
    };
    return colors[ageGroup as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Members Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and view your church members
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-3">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-100 dark:bg-green-900 p-3">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Members</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-100 dark:bg-purple-900 p-3">
                <UserPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">New This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900 p-3">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last 30 Days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lastThirtyDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Age Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="adolescent">Adolescent</SelectItem>
              <SelectItem value="adult">Adult</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportMembers}>
            <Download className="h-4 w-4 mr-2" />
            Export Members
          </Button>
        </div>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Church Members ({filteredMembers.length})
          </CardTitle>
          <CardDescription>
            Manage your church member database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Demographics</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Join Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.title ? `${member.title} ` : ''}{member.firstName} {member.surname}
                        </div>
                        {member.parentId && (
                          <div className="text-sm text-gray-500">Child member</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="capitalize text-sm">{member.gender}</span>
                        <Badge variant="secondary" className={getAgeGroupBadge(member.ageGroup)}>
                          {member.ageGroup}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {member.phone && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="h-3 w-3 mr-1" />
                            {member.phone}
                          </div>
                        )}
                        {member.email && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.email}
                          </div>
                        )}
                        {member.address && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-3 w-3 mr-1" />
                            {member.address.slice(0, 30)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(member.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={member.isCurrentMember ? "default" : "secondary"}>
                        {member.isCurrentMember ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No members found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || genderFilter !== "all" || ageGroupFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search or filters."
                  : "Get started by adding your first member."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member information and settings.
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <EditMemberForm
              member={selectedMember}
              onSave={handleSaveMember}
              onCancel={handleCancelEdit}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}