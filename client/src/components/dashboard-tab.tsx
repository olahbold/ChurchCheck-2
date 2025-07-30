import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceStats, MemberWithChildren } from "@/lib/types";
import { Users, Calendar, AlertTriangle, TrendingUp, Download, Search, MessageSquare, Mail, CheckCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DashboardTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpTemplate, setFollowUpTemplate] = useState(
    "Hi [Name], we missed you at church today. Hope to see you next Sunday! - Grace Community Church"
  );
  const [isSendingAll, setIsSendingAll] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get attendance stats
  const { data: attendanceStats } = useQuery<AttendanceStats>({
    queryKey: ['/api/attendance/stats'],
  });

  // Get today's attendance details
  const { data: todaysAttendance = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/today'],
  });

  // Get all members with search and filter
  const { data: members = [] } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members'],
  });

  // Get members needing follow-up
  const { data: followUpMembers = [] } = useQuery<any[]>({
    queryKey: ['/api/follow-up'],
  });

  // Mutation for individual follow-up
  const sendFollowUpMutation = useMutation({
    mutationFn: async ({ memberId, method }: { memberId: string; method: 'sms' | 'email' }) => {
      return await apiRequest('POST', `/api/follow-up/${memberId}`, { method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up'] });
      toast({
        title: "Follow-up sent",
        description: "Contact has been recorded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send follow-up",
        variant: "destructive",
      });
    }
  });

  // Function to send individual follow-up
  const handleSendFollowUp = async (memberId: string, method: 'sms' | 'email') => {
    sendFollowUpMutation.mutate({ memberId, method });
  };

  // Function to send all follow-ups
  const handleSendAll = async () => {
    setIsSendingAll(true);
    try {
      const promises = followUpMembers.map(member => 
        apiRequest('POST', `/api/follow-up/${member.id}`, {
          method: member.phone ? 'sms' : 'email'
        })
      );
      
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['/api/follow-up'] });
      
      toast({
        title: "Bulk follow-up completed",
        description: `Sent ${followUpMembers.length} follow-up messages successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Some follow-ups failed to send",
        variant: "destructive",
      });
    } finally {
      setIsSendingAll(false);
    }
  };

  // Calculate comprehensive stats
  const totalRegisteredMembers = members.length;
  const todaysMemberAttendance = todaysAttendance.filter(record => record.memberId && !record.isVisitor).length;
  const todaysVisitorAttendance = todaysAttendance.filter(record => record.isVisitor).length;
  const totalTodaysAttendance = todaysAttendance.length;
  
  // Calculate attendance rate based on registered members only
  const memberAttendanceRate = totalRegisteredMembers > 0 
    ? Math.round((todaysMemberAttendance / totalRegisteredMembers) * 100) 
    : 0;

  // Calculate average weekly attendance (estimate based on today's attendance)
  const avgWeeklyAttendance = Math.round(totalTodaysAttendance * 1.2); // More realistic estimate

  const filteredMembers = members.filter(member => {
    if (statusFilter === 'current' && !member.isCurrentMember) return false;
    if (statusFilter === 'new' && member.isCurrentMember) return false;
    return true;
  });

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
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportAttendance = async () => {
    try {
      const response = await fetch('/api/export/attendance');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_records.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getAttendanceStatus = (member: MemberWithChildren) => {
    // Mock attendance status - in real app this would come from recent attendance data
    const statuses = ['present', 'absent-1', 'absent-2', 'absent-3+'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    switch (status) {
      case 'present':
        return { text: 'Present Today', color: 'text-[hsl(142,76%,36%)]' };
      case 'absent-1':
        return { text: 'Absent (1 week)', color: 'text-[hsl(45,93%,47%)]' };
      case 'absent-2':
        return { text: 'Absent (2 weeks)', color: 'text-[hsl(45,93%,47%)]' };
      default:
        return { text: 'Absent (3+ weeks)', color: 'text-[hsl(0,84%,60%)]' };
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Registered Members</p>
              <p className="text-3xl font-bold text-slate-900">{totalRegisteredMembers}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center">
              <Users className="text-[hsl(258,90%,66%)] text-xl" />
            </div>
          </div>
          <p className="text-sm text-[hsl(142,76%,36%)] mt-2">
            <TrendingUp className="inline h-3 w-3 mr-1" />
            Enrolled in system
          </p>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Today's Attendance</p>
              <p className="text-3xl font-bold text-slate-900">{totalTodaysAttendance}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center">
              <Calendar className="text-[hsl(142,76%,36%)] text-xl" />
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-2">{todaysMemberAttendance} members + {todaysVisitorAttendance} visitors</p>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Follow-up Needed</p>
              <p className="text-3xl font-bold text-slate-900">{followUpMembers.length}</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(45,93%,47%)]/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-[hsl(45,93%,47%)] text-xl" />
            </div>
          </div>
          <p className="text-sm text-[hsl(45,93%,47%)] mt-2">3+ services missed</p>
        </Card>

        <Card className="church-stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Member Attendance Rate</p>
              <p className="text-3xl font-bold text-slate-900">{memberAttendanceRate}%</p>
            </div>
            <div className="w-12 h-12 bg-[hsl(271,91%,65%)]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-[hsl(271,91%,65%)] text-xl" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2">
            {todaysMemberAttendance} of {totalRegisteredMembers} attended today
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Member Search & Filter */}
        <Card className="church-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Member Directory</CardTitle>
            <div className="flex space-x-2">
              <Button onClick={handleExportMembers} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="church-form-input"
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                </div>
                <Button className="church-button-primary">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex space-x-4">
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="church-form-input">
                    <SelectValue placeholder="All Groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="child">Children</SelectItem>
                    <SelectItem value="adolescent">Adolescent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="church-form-input">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="current">Current Members</SelectItem>
                    <SelectItem value="new">New Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredMembers.map((member) => {
                const attendanceStatus = getAttendanceStatus(member);
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {member.firstName[0]}{member.surname[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {member.firstName} {member.surname}
                        </p>
                        <p className="text-sm text-slate-500">
                          {member.ageGroup} • {member.isCurrentMember ? 'Current' : 'New'} Member
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm ${attendanceStatus.color}`}>
                        {attendanceStatus.text}
                      </p>
                      <p className="text-xs text-slate-500">
                        Last: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No members found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Follow-up Notifications */}
        <Card className="church-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-900">Follow-up Queue</CardTitle>
            <Button 
              className="church-button-primary" 
              size="sm"
              onClick={handleSendAll}
              disabled={followUpMembers.length === 0 || isSendingAll}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {isSendingAll ? 'Sending...' : 'Send All'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {followUpMembers.slice(0, 5).map((member: any) => (
                <div key={member.id} className="p-4 bg-[hsl(45,93%,47%)]/5 border border-[hsl(45,93%,47%)]/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {member.firstName} {member.surname}
                      </p>
                      <p className="text-sm text-slate-500">
                        {member.group} • {member.phone}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-[hsl(0,84%,60%)]/10 text-[hsl(0,84%,60%)] text-sm rounded-full">
                      {member.followUpRecord?.consecutiveAbsences || 3} weeks absent
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    Last attended: {new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => handleSendFollowUp(member.id, 'sms')}
                      disabled={!member.phone || sendFollowUpMutation.isPending}
                    >
                      <Phone className="mr-1 h-3 w-3" />
                      SMS
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => handleSendFollowUp(member.id, 'email')}
                      disabled={!member.email || sendFollowUpMutation.isPending}
                    >
                      <Mail className="mr-1 h-3 w-3" />
                      Email
                    </Button>
                    <Button 
                      size="sm" 
                      className="church-button-secondary text-xs"
                      onClick={() => handleSendFollowUp(member.id, member.phone ? 'sms' : 'email')}
                      disabled={sendFollowUpMutation.isPending}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {sendFollowUpMutation.isPending ? 'Sending...' : 'Mark Contacted'}
                    </Button>
                  </div>
                </div>
              ))}

              {followUpMembers.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No follow-ups needed</p>
                </div>
              )}
            </div>

            {/* Follow-up Template */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">Message Template</h4>
              <Textarea
                value={followUpTemplate}
                onChange={(e) => setFollowUpTemplate(e.target.value)}
                className="church-form-input"
                rows={3}
                placeholder="Enter your follow-up message template..."
              />
              <Button className="church-button-outline mt-3">
                <CheckCircle className="mr-2 h-4 w-4" />
                Update Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
