import { useState, useEffect } from "react";

// Enhanced animated counter with spring effect
function AnimatedCounter({ target, duration = 2500 }: { target: number; duration?: number }) {
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
      {count}
    </motion.span>
  );
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, UserPlus, Download, Edit, Calendar, Phone, Mail, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "backOut"
      }
    }
  };

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
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Welcome Header */}
      <motion.div variants={cardVariants}>
        <Card className="bg-gradient-to-r from-slate-50 to-green-50 border border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-900 mb-2">👥 Member Management System</CardTitle>
            <p className="text-slate-700 mb-3">
              Comprehensive member directory with advanced search, filtering, and profile management capabilities.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                📊 <strong>Admin Member Tools:</strong> View detailed member statistics, search and filter by demographics, edit member information, track registration dates, manage family relationships, and export member data for reports. Full administrative control over your congregation's directory.
              </p>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
      
      <motion.div variants={cardVariants}>
        <motion.h2 
          className="text-2xl font-bold text-gray-900 dark:text-white"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          📋 Members Management
        </motion.h2>
        <motion.p 
          className="text-gray-600 dark:text-gray-400 mt-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Manage and view your church members
        </motion.p>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        variants={containerVariants}
      >
        <motion.div variants={statsVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Members</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <AnimatedCounter target={stats.total} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <Users className="text-blue-500 text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-blue-600 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Users className="inline h-3 w-3 mr-1" />
                All registered members
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={statsVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Members</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    <AnimatedCounter target={stats.active} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                >
                  <Users className="text-green-500 text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-green-600 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Users className="inline h-3 w-3 mr-1" />
                Currently active
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-500 to-green-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={statsVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">New This Month</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    <AnimatedCounter target={stats.newThisMonth} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                >
                  <UserPlus className="text-[hsl(258,90%,66%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(258,90%,66%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                <UserPlus className="inline h-3 w-3 mr-1" />
                Recent registrations
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={statsVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Last 30 Days</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <AnimatedCounter target={stats.lastThirtyDays} />
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
                >
                  <Calendar className="text-orange-500 text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-orange-600 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Calendar className="inline h-3 w-3 mr-1" />
                Monthly growth
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.3, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
        variants={cardVariants}
      >
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
      </motion.div>

      {/* Members Table */}
      <motion.div variants={cardVariants}>
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
                {filteredMembers.map((member, index) => (
                  <motion.tr 
                    key={member.id} 
                    className="border-b border-gray-100 dark:border-gray-800 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-sm cursor-pointer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    whileHover={{ 
                      scale: 1.01, 
                      y: -1,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <td className="py-4 px-4">
                      <motion.div
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {member.title ? `${member.title} ` : ''}{member.firstName} {member.surname}
                        </div>
                        {member.parentId && (
                          <div className="text-sm text-gray-500">Child member</div>
                        )}
                      </motion.div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="capitalize text-sm text-gray-700 dark:text-gray-300">{member.gender}</span>
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
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMember(member)}
                          className="border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </motion.div>
                    </td>
                  </motion.tr>
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
      </motion.div>

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
    </motion.div>
  );
}