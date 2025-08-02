import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceStats, MemberWithChildren } from "@/lib/types";
import { Users, Calendar, AlertTriangle, TrendingUp, Download, Search, MessageSquare, Mail, CheckCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
    }, 300); // Longer delay to make animation more noticeable
    
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

export default function DashboardTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpTemplate, setFollowUpTemplate] = useState(
    "Hi [Name], we missed you at church today. Hope to see you next Sunday! - Grace Community Church"
  );
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
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
  const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery<MemberWithChildren[]>({
    queryKey: ['/api/members'],
    retry: 1,
    refetchOnMount: true,
  });
  
  // Member data successfully loaded
  useEffect(() => {
    if (members.length > 0 && attendanceStats) {
      setIsLoaded(true);
    }
  }, [members, attendanceStats]);

  // Get recent attendance history (last 30 days) for proper attendance status calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  
  const { data: recentAttendanceData = [] } = useQuery<any[]>({
    queryKey: ['/api/attendance/history', startDate, endDate],
    queryFn: () => fetch(`/api/attendance/history?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get members needing follow-up
  const { data: followUpMembers = [] } = useQuery<any[]>({
    queryKey: ['/api/follow-up'],
  });

  // Mutation for individual follow-up
  const sendFollowUpMutation = useMutation({
    mutationFn: async ({ memberId, method }: { memberId: string; method: 'sms' | 'email' }) => {
      return await apiRequest(`/api/follow-up/${memberId}`, {
        method: 'POST',
        body: JSON.stringify({ method }),
      });
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
        apiRequest(`/api/follow-up/${member.id}`, {
          method: 'POST',
          body: JSON.stringify({
            method: member.phone ? 'sms' : 'email'
          }),
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
      const response = await fetch('/api/export/members-fresh', {
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
    // Get member's attendance records from recent attendance data (last 30 days)
    const memberAttendanceRecords = recentAttendanceData.filter(record => 
      record.memberId === member.id && !record.isVisitor
    );
    
    if (memberAttendanceRecords.length === 0) {
      return { 
        text: 'Absent (4+ weeks)', 
        color: 'text-[hsl(0,84%,60%)]',
        lastDate: 'Never attended'
      };
    }

    // Find most recent attendance
    const attendanceDates = memberAttendanceRecords.map(record => new Date(record.attendanceDate));
    const mostRecentAttendance = new Date(Math.max(...attendanceDates.map(d => d.getTime())));
    const daysSinceLastAttendance = Math.floor((new Date().getTime() - mostRecentAttendance.getTime()) / (1000 * 60 * 60 * 24));
    
    const lastDateString = mostRecentAttendance.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    if (daysSinceLastAttendance === 0) {
      return { 
        text: 'Present Today', 
        color: 'text-[hsl(142,76%,36%)]',
        lastDate: lastDateString
      };
    } else if (daysSinceLastAttendance <= 7) {
      return { 
        text: `Absent (${daysSinceLastAttendance} days)`, 
        color: 'text-[hsl(45,93%,47%)]',
        lastDate: lastDateString
      };
    } else if (daysSinceLastAttendance <= 14) {
      return { 
        text: 'Absent (1 week)', 
        color: 'text-[hsl(45,93%,47%)]',
        lastDate: lastDateString
      };
    } else if (daysSinceLastAttendance <= 21) {
      return { 
        text: 'Absent (2 weeks)', 
        color: 'text-[hsl(30,100%,50%)]',
        lastDate: lastDateString
      };
    } else if (daysSinceLastAttendance <= 28) {
      return { 
        text: 'Absent (3 weeks)', 
        color: 'text-[hsl(15,100%,50%)]',
        lastDate: lastDateString
      };
    } else {
      return { 
        text: 'Absent (4+ weeks)', 
        color: 'text-[hsl(0,84%,60%)]',
        lastDate: lastDateString
      };
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0 },
    visible: { 
      scale: 1,
      transition: {
        type: "spring",
        delay: 0.3,
        damping: 15,
        stiffness: 300
      }
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Stats Overview */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
      >
        <motion.div variants={cardVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Registered Members</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    {isLoaded ? <AnimatedCounter target={totalRegisteredMembers} /> : '---'}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(258,90%,66%)]/10 rounded-lg flex items-center justify-center"
                  variants={iconVariants}
                >
                  <Users className="text-[hsl(258,90%,66%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(142,76%,36%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <TrendingUp className="inline h-3 w-3 mr-1" />
                Enrolled in system
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(258,90%,66%)] to-[hsl(271,91%,65%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Today's Attendance</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                  >
                    {isLoaded ? <AnimatedCounter target={totalTodaysAttendance} /> : '---'}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(142,76%,36%)]/10 rounded-lg flex items-center justify-center"
                  variants={iconVariants}
                >
                  <Calendar className="text-[hsl(142,76%,36%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-blue-600 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 }}
              >
                {todaysMemberAttendance} members + {todaysVisitorAttendance} visitors
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(142,76%,36%)] to-[hsl(120,76%,50%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.1, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Follow-up Needed</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.6 }}
                  >
                    {isLoaded ? <AnimatedCounter target={followUpMembers.length} /> : '---'}
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(45,93%,47%)]/10 rounded-lg flex items-center justify-center"
                  variants={iconVariants}
                >
                  <AlertTriangle className="text-[hsl(45,93%,47%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-[hsl(45,93%,47%)] mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
              >
                3+ services missed
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(45,93%,47%)] to-[hsl(30,100%,50%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="stat-card-hover cursor-pointer overflow-hidden relative h-[140px]">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Member Attendance Rate</p>
                  <motion.p 
                    className="text-3xl font-bold text-slate-900"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    {isLoaded ? <AnimatedCounter target={memberAttendanceRate} /> : '---'}%
                  </motion.p>
                </div>
                <motion.div 
                  className="w-12 h-12 bg-[hsl(271,91%,65%)]/10 rounded-lg flex items-center justify-center"
                  variants={iconVariants}
                >
                  <TrendingUp className="text-[hsl(271,91%,65%)] text-xl pulse-icon" />
                </motion.div>
              </div>
              <motion.p 
                className="text-sm text-slate-600 mt-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
              >
                {todaysMemberAttendance} of {totalRegisteredMembers} attended today
              </motion.p>
              <motion.div
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[hsl(271,91%,65%)] to-[hsl(258,90%,66%)]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.3, duration: 1.2 }}
              />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        {/* Member Search & Filter */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.7, duration: 0.6 }}
        >
          <Card className="church-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ delay: 2, duration: 1, ease: "easeOut" }}
                >
                  <Search className="h-5 w-5" />
                </motion.div>
                Member Directory
              </CardTitle>
              <div className="flex space-x-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button onClick={handleExportMembers} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </motion.div>
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

            <motion.div 
              className="space-y-3 max-h-96 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.4 }}
            >
              <AnimatePresence>
                {filteredMembers.map((member, index) => {
                  const attendanceStatus = getAttendanceStatus(member);
                  return (
                    <motion.div 
                      key={member.id} 
                      className="member-item-hover flex items-center justify-between p-4 border border-slate-200 rounded-lg cursor-pointer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ 
                        delay: index * 0.05,
                        duration: 0.3,
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-4">
                        <motion.div 
                          className="w-10 h-10 bg-[hsl(258,90%,66%)] rounded-full flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ 
                            delay: 2.4 + (index * 0.05),
                            type: "spring",
                            stiffness: 500
                          }}
                        >
                          <span className="text-white font-medium">
                            {member.firstName[0]}{member.surname[0]}
                          </span>
                        </motion.div>
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
                        <motion.p 
                          className={`text-sm ${attendanceStatus.color}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2.5 + (index * 0.05) }}
                        >
                          {attendanceStatus.text}
                        </motion.p>
                        <motion.p 
                          className="text-xs text-slate-500"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 2.6 + (index * 0.05) }}
                        >
                          Last: {attendanceStatus.lastDate}
                        </motion.p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No members found</p>
                </div>
              )}
            </motion.div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Follow-up Notifications */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.9, duration: 0.6 }}
        >
          <Card className="church-card overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 2.1, type: "spring", stiffness: 500 }}
                >
                  <MessageSquare className="h-5 w-5" />
                </motion.div>
                Follow-up Queue
              </CardTitle>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  className="church-button-primary" 
                  size="sm"
                  onClick={handleSendAll}
                  disabled={followUpMembers.length === 0 || isSendingAll}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {isSendingAll ? 'Sending...' : 'Send All'}
                </Button>
              </motion.div>
            </CardHeader>
          <CardContent>
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.3, duration: 0.4 }}
            >
              {followUpMembers.slice(0, 5).map((member: any, index) => (
                <motion.div 
                  key={member.id} 
                  className="p-4 bg-[hsl(45,93%,47%)]/5 border border-[hsl(45,93%,47%)]/20 rounded-lg member-item-hover cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: 2.5 + (index * 0.1),
                    duration: 0.4,
                    type: "spring",
                    stiffness: 300
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                >
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
                </motion.div>
              ))}

              {followUpMembers.length === 0 && (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.5, duration: 0.4 }}
                >
                  <CheckCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No follow-ups needed</p>
                </motion.div>
              )}
            </motion.div>

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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
